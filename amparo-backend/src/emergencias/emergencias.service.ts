import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { erroDoBanco, tratarErro } from '../common/erro.util';
import { mascararTelefone } from '../common/mascara.util';
import { gerarToken, hashToken } from '../common/token.util';
import { MensagensService } from '../mensagens/mensagens.service';

type AvisoBanco = { guardiao_id: string | null; nome_guardia: string; enviado_em: string; confirmado_em: string | null };

/** "Quem foi avisada": nome da guardiã, quando o aviso saiu e se ela confirmou. */
function formatarAviso(a: AvisoBanco) {
  return {
    guardiao_id: a.guardiao_id,
    nome_completo: a.nome_guardia,
    enviado_em: a.enviado_em,
    confirmado_em: a.confirmado_em,
    status: a.confirmado_em ? 'CONFIRMADO' : 'AGUARDANDO',
  };
}

@Injectable()
export class EmergenciasService {
  private readonly logger = new Logger(EmergenciasService.name);

  private supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  );

  private readonly filasPorUsuaria = new Map<string, Promise<unknown>>();

  constructor(private mensagens: MensagensService) {}

  /** Executa uma tarefa por vez para a mesma usuária (evita a corrida de duplo clique). */
  private async exclusivoPorUsuaria<T>(usuariaId: string, tarefa: () => Promise<T>): Promise<T> {
    const anterior = this.filasPorUsuaria.get(usuariaId) ?? Promise.resolve();
    const atual = anterior.catch(() => undefined).then(tarefa);
    this.filasPorUsuaria.set(usuariaId, atual);
    try {
      return await atual;
    } finally {
      if (this.filasPorUsuaria.get(usuariaId) === atual) this.filasPorUsuaria.delete(usuariaId);
    }
  }

  async acionar(dados: any, usuariaIdAutenticada: string) {
    if (dados.usuaria_id && dados.usuaria_id !== usuariaIdAutenticada) {
      throw new HttpException({ erro: 'Acesso Negado: Você não pode acionar emergência para outra usuária.' }, HttpStatus.FORBIDDEN);
    }
    const dadosDaUsuaria = { ...dados, usuaria_id: usuariaIdAutenticada };
    return this.exclusivoPorUsuaria(usuariaIdAutenticada, () => this.criarEmergencia(dadosDaUsuaria));
  }

  private async criarEmergencia(dados: any) {
    try {
      // Prevenção de abuso e duplicidade
      const { data: ativas, error: errAtivas } = await this.supabase
        .from('emergencias')
        .select('*')
        .eq('usuaria_id', dados.usuaria_id)
        .eq('status', 'ATIVA');

      if (errAtivas) throw erroDoBanco(errAtivas);

      if (ativas && ativas.length > 0) {
          throw new HttpException({ 
              erro: 'Uma emergência já está ATIVA para esta usuária.',
              emergencia_ativa: ativas[0]
          }, HttpStatus.CONFLICT); // 409 Conflict
      }

      // 3. Criar a emergência
      const { data: emergencia, error: erroEmergencia } = await this.supabase
        .from('emergencias')
        .insert([{ usuaria_id: dados.usuaria_id, status: 'ATIVA' }])
        .select()
        .single();

      if (erroEmergencia) throw erroDoBanco(erroEmergencia);

      // 4. Salvar o ponto de GPS inicial, se aplicável
      if (dados.latitude != null && dados.longitude != null) {
        await this.supabase.from('rastreamento_gps').insert([
          {
            emergencia_id: emergencia.id,
            latitude: dados.latitude,
            longitude: dados.longitude,
          },
        ]);
      }

      // 5. Buscar Guardiões
      const { data: guardioes, error: erroGuardioes } = await this.supabase
        .from('guardioes')
        .select('*')
        .eq('usuaria_id', dados.usuaria_id);

      if (erroGuardioes) throw erroDoBanco(erroGuardioes);
      
      let statusAlerta = 'SUCESSO';
      let avisos: any[] = [];
      if (!guardioes || guardioes.length === 0) {
          statusAlerta = 'ALERTA_FALHA_SEM_GUARDIOES';
          this.logger.warn(`Emergência ${emergencia.id}: nenhum guardião cadastrado para notificar.`);
      } else {
          this.logger.log(`🚨 Emergência acionada (ID: ${emergencia.id}). Disparando mensagem de socorro para ${guardioes.length} guardiões...`);
          // Cada guardiã recebe um link próprio para confirmar que viu o pedido de ajuda
          const tokens = guardioes.map(() => gerarToken());
          const { data: criados, error: erroAvisos } = await this.supabase
            .from('avisos_emergencia')
            .insert(guardioes.map((g, i) => ({
              emergencia_id: emergencia.id,
              guardiao_id: g.id,
              usuaria_id: dados.usuaria_id,
              nome_guardia: g.nome_completo,
              token_hash: hashToken(tokens[i]),
            })))
            .select('guardiao_id, nome_guardia, enviado_em, confirmado_em');
          if (erroAvisos) {
            // O aviso às guardiãs não pode impedir o registro da emergência
            this.logger.error(`Emergência ${emergencia.id}: falha ao registrar os avisos (${erroAvisos.message}).`);
          } else {
            avisos = criados ?? [];
          }
          guardioes.forEach((guardiao, i) => {
            this.logger.log(`Enviando [SMS/PUSH/WHATSAPP] para guardiã ${guardiao.id} (${mascararTelefone(guardiao.telefone)}).`);
            this.mensagens.enviarPedidoDeAjuda(guardiao.telefone, tokens[i]);
          });
      }

      return {
        mensagem: 'Emergência acionada!',
        emergencia_id: emergencia.id,
        guardioes_notificados: guardioes?.length || 0,
        status_notificacao: statusAlerta,
        avisos: avisos.map(formatarAviso),
      };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível acionar a emergência.');
    }
  }

  async atualizarLocalizacao(emergenciaId: string, dados: any, usuariaIdAutenticada: string) {
    try {
      const { data: emergencia } = await this.supabase.from('emergencias').select('*').eq('id', emergenciaId).single();
      if (!emergencia) throw new HttpException({ erro: 'Emergência não encontrada.' }, HttpStatus.NOT_FOUND);
      if (emergencia.usuaria_id !== usuariaIdAutenticada) throw new HttpException({ erro: 'Acesso Negado.' }, HttpStatus.FORBIDDEN);
      if (emergencia.status !== 'ATIVA') throw new HttpException({ erro: 'Emergência não está ativa.' }, HttpStatus.BAD_REQUEST);

      const { data, error } = await this.supabase
        .from('rastreamento_gps')
        .insert([{
            emergencia_id: emergenciaId,
            latitude: dados.latitude,
            longitude: dados.longitude,
        }]).select();

      if (error) throw erroDoBanco(error);

      return {
        mensagem: 'Localização atualizada.',
        ponto_gps: data ? data[0] : null,
      };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível atualizar a localização.');
    }
  }

  async encerrar(emergenciaId: string, usuariaIdAutenticada: string) {
    try {
      const { data: emergencia } = await this.supabase.from('emergencias').select('*').eq('id', emergenciaId).single();
      if (!emergencia) throw new HttpException({ erro: 'Emergência não encontrada.' }, HttpStatus.NOT_FOUND);
      if (emergencia.usuaria_id !== usuariaIdAutenticada) throw new HttpException({ erro: 'Acesso Negado.' }, HttpStatus.FORBIDDEN);
      if (emergencia.status !== 'ATIVA') throw new HttpException({ erro: 'Emergência já foi encerrada.' }, HttpStatus.BAD_REQUEST);

      const { data, error } = await this.supabase
        .from('emergencias')
        .update({ status: 'ENCERRADA', encerrado_em: new Date().toISOString() })
        .eq('id', emergenciaId)
        .select();

      if (error) throw erroDoBanco(error);

      this.logger.log(`Emergência ${emergenciaId} encerrada.`);

      return {
        mensagem: 'Emergência encerrada com segurança.',
        emergencia: data ? data[0] : null,
      };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível encerrar a emergência.');
    }
  }

  async listarRota(emergenciaId: string, usuariaIdAutenticada: string) {
    try {
      // Simplificado: apenas para visualizar. Num sistema real, os guardiões acessariam isso.
      // Vamos permitir o dono ver sua propria rota.
      const { data: emergencia } = await this.supabase.from('emergencias').select('*').eq('id', emergenciaId).single();
      if (!emergencia) throw new HttpException({ erro: 'Emergência não encontrada.' }, HttpStatus.NOT_FOUND);
      if (emergencia.usuaria_id !== usuariaIdAutenticada) throw new HttpException({ erro: 'Acesso Negado.' }, HttpStatus.FORBIDDEN);

      const { data, error } = await this.supabase
        .from('rastreamento_gps')
        .select('*')
        .eq('emergencia_id', emergenciaId)
        .order('registrado_em', { ascending: true });

      if (error) throw erroDoBanco(error);

      return { rastro_gps: data };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível listar a rota.');
    }
  }

  /** Situação da emergência para a tela "Alerta enviado". */
  async detalhe(emergenciaId: string, usuariaIdAutenticada: string) {
    try {
      const { data: emergencia, error } = await this.supabase.from('emergencias').select('*').eq('id', emergenciaId).maybeSingle();
      if (error) throw erroDoBanco(error);
      if (!emergencia) throw new HttpException({ erro: 'Emergência não encontrada.' }, HttpStatus.NOT_FOUND);
      if (emergencia.usuaria_id !== usuariaIdAutenticada) throw new HttpException({ erro: 'Acesso Negado.' }, HttpStatus.FORBIDDEN);
      return { emergencia, avisos: await this.avisosDa(emergenciaId) };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível carregar a emergência.');
    }
  }

  /** Emergência ainda ativa (para o app retomar a tela de alerta ao ser reaberto). */
  async ativa(usuariaIdAutenticada: string) {
    try {
      const { data, error } = await this.supabase
        .from('emergencias')
        .select('*')
        .eq('usuaria_id', usuariaIdAutenticada)
        .eq('status', 'ATIVA')
        .maybeSingle();
      if (error) throw erroDoBanco(error);
      if (!data) return { emergencia: null, avisos: [] };
      return { emergencia: data, avisos: await this.avisosDa(data.id) };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível verificar a emergência ativa.');
    }
  }

  private async avisosDa(emergenciaId: string) {
    const { data, error } = await this.supabase
      .from('avisos_emergencia')
      .select('guardiao_id, nome_guardia, enviado_em, confirmado_em')
      .eq('emergencia_id', emergenciaId)
      .order('enviado_em', { ascending: true });
    if (error) throw erroDoBanco(error);
    return (data ?? []).map(formatarAviso);
  }

  /** Página pública do pedido de ajuda (link recebido pela guardiã). */
  async buscarAlerta(token: string) {
    const { data: aviso, error } = await this.supabase
      .from('avisos_emergencia')
      .select('id, emergencia_id, usuaria_id, confirmado_em')
      .eq('token_hash', hashToken(token))
      .maybeSingle();
    if (error) throw erroDoBanco(error);
    if (!aviso) return null;
    const { data: emergencia, error: erroE } = await this.supabase
      .from('emergencias')
      .select('status, criado_em')
      .eq('id', aviso.emergencia_id)
      .maybeSingle();
    if (erroE) throw erroDoBanco(erroE);
    const { data: usuaria, error: erroU } = await this.supabase.from('usuarias').select('nome_completo').eq('id', aviso.usuaria_id).maybeSingle();
    if (erroU) throw erroDoBanco(erroU);
    const ativa = emergencia?.status === 'ATIVA';
    // A localização só é mostrada enquanto o pedido estiver ativo
    let ultimoPonto: { latitude: number; longitude: number; registrado_em: string } | null = null;
    if (ativa) {
      const { data: pontos, error: erroP } = await this.supabase
        .from('rastreamento_gps')
        .select('latitude, longitude, registrado_em')
        .eq('emergencia_id', aviso.emergencia_id)
        .order('registrado_em', { ascending: false })
        .limit(1);
      if (erroP) throw erroDoBanco(erroP);
      ultimoPonto = pontos?.[0] ?? null;
    }
    return {
      id: aviso.id as string,
      ativa,
      confirmado: !!aviso.confirmado_em,
      acionadoEm: emergencia?.criado_em as string | undefined,
      primeiroNome: String(usuaria?.nome_completo ?? '').split(' ')[0],
      ultimoPonto,
    };
  }

  async confirmarAlerta(token: string) {
    const alerta = await this.buscarAlerta(token);
    if (!alerta) return null;
    if (!alerta.confirmado) {
      const { error } = await this.supabase
        .from('avisos_emergencia')
        .update({ confirmado_em: new Date().toISOString() })
        .eq('id', alerta.id);
      if (error) throw erroDoBanco(error);
    }
    return { ...alerta, confirmado: true };
  }
}
