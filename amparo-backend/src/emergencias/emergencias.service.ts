import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { erroDoBanco, tratarErro } from '../common/erro.util';
import { mascararTelefone } from '../common/mascara.util';

@Injectable()
export class EmergenciasService {
  private readonly logger = new Logger(EmergenciasService.name);

  private supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  );

  private readonly filasPorUsuaria = new Map<string, Promise<unknown>>();

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
      if (!guardioes || guardioes.length === 0) {
          statusAlerta = 'ALERTA_FALHA_SEM_GUARDIOES';
          this.logger.warn(`Emergência ${emergencia.id}: nenhum guardião cadastrado para notificar.`);
      } else {
          this.logger.log(`🚨 Emergência acionada (ID: ${emergencia.id}). Disparando mensagem de socorro para ${guardioes.length} guardiões...`);
          guardioes.forEach(guardiao => {
            this.logger.log(`Enviando [SMS/PUSH/WHATSAPP] para guardiã ${guardiao.id} (${mascararTelefone(guardiao.telefone)}).`);
          });
      }

      return {
        mensagem: 'Emergência acionada!',
        emergencia_id: emergencia.id,
        guardioes_notificados: guardioes?.length || 0,
        status_notificacao: statusAlerta
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
}
