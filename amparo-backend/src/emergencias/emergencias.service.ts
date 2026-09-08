import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class EmergenciasService {
  private supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_KEY as string,
  );

  async acionar(dados: any, usuariaIdAutenticada: string) {
    try {
      if (!dados.usuaria_id) {
          throw new HttpException({ erro: 'O ID da usuária é obrigatório.' }, HttpStatus.BAD_REQUEST);
      }
      
      // 1. Validar Autenticação e Permissão
      if (dados.usuaria_id !== usuariaIdAutenticada) {
          throw new HttpException({ erro: 'Acesso Negado: Você não pode acionar emergência para outra usuária.' }, HttpStatus.FORBIDDEN);
      }

      // 2. Prevenção de Abuso e Duplicidade
      const { data: ativas, error: errAtivas } = await this.supabase
        .from('emergencias')
        .select('*')
        .eq('usuaria_id', dados.usuaria_id)
        .eq('status', 'ATIVA');

      if (errAtivas) throw new Error(errAtivas.message);

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

      if (erroEmergencia) throw new Error(erroEmergencia.message);

      // 4. Salvar o ponto de GPS inicial, se aplicável
      if (dados.latitude && dados.longitude) {
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

      if (erroGuardioes) throw new Error(erroGuardioes.message);
      
      let statusAlerta = 'SUCESSO';
      if (!guardioes || guardioes.length === 0) {
          statusAlerta = 'ALERTA_FALHA_SEM_GUARDIOES';
          console.warn('[AVISO] Emergência ' + emergencia.id + ': Nenhum guardião cadastrado para notificar.');
      } else {
          console.log('\n🚨 EMERGÊNCIA ACIONADA! (ID: ' + emergencia.id + ')');
          console.log('Disparando mensagem de socorro para ' + guardioes.length + ' guardiões...');
          guardioes.forEach(guardiao => {
            console.log(' -> Enviando [SMS/PUSH/WHATSAPP] para ' + guardiao.nome_completo + ' (' + guardiao.telefone + ').');
          });
      }

      return {
        mensagem: 'Emergência acionada!',
        emergencia_id: emergencia.id,
        guardioes_notificados: guardioes?.length || 0,
        status_notificacao: statusAlerta
      };
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST;
      const response = error instanceof HttpException ? error.getResponse() : { erro: (error as any).message || 'Falha ao acionar' };
      throw new HttpException(response, status);
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

      if (error) throw new Error(error.message);

      return {
        mensagem: 'Localização atualizada.',
        ponto_gps: data ? data[0] : null,
      };
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST;
      const response = error instanceof HttpException ? error.getResponse() : { erro: (error as any).message };
      throw new HttpException(response, status);
    }
  }

  async encerrar(emergenciaId: string, usuariaIdAutenticada: string) {
    try {
      const { data: emergencia } = await this.supabase.from('emergencias').select('*').eq('id', emergenciaId).single();
      if (!emergencia) throw new HttpException({ erro: 'Emergência não encontrada.' }, HttpStatus.NOT_FOUND);
      if (emergencia.usuaria_id !== usuariaIdAutenticada) throw new HttpException({ erro: 'Acesso Negado.' }, HttpStatus.FORBIDDEN);

      const { data, error } = await this.supabase
        .from('emergencias')
        .update({ status: 'ENCERRADA', encerrado_em: new Date().toISOString() })
        .eq('id', emergenciaId)
        .select();

      if (error) throw new Error(error.message);

      console.log('✅ Emergência ' + emergenciaId + ' encerrada.');

      return {
        mensagem: 'Emergência encerrada com segurança.',
        emergencia: data ? data[0] : null,
      };
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST;
      const response = error instanceof HttpException ? error.getResponse() : { erro: (error as any).message };
      throw new HttpException(response, status);
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

      if (error) throw new Error(error.message);

      return { rastro_gps: data };
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST;
      const response = error instanceof HttpException ? error.getResponse() : { erro: (error as any).message };
      throw new HttpException(response, status);
    }
  }
}
