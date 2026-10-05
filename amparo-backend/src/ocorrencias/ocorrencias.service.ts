import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { erroDoBanco, tratarErro } from '../common/erro.util';
import { conteudoCorrespondeAoMime } from '../common/tipo-arquivo.util';

const JANELA_DUPLICIDADE_MS = 30_000;

@Injectable()
export class OcorrenciasService {
  private readonly logger = new Logger(OcorrenciasService.name);

  private supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  );

  async criar(dados: any) {
    try {
      const desde = new Date(Date.now() - JANELA_DUPLICIDADE_MS).toISOString();
      const { data: recentes, error: erroRecentes } = await this.supabase
        .from('ocorrencias')
        .select('tipos_violencia, mensagem')
        .eq('usuaria_id', dados.usuaria_id)
        .gte('criado_em', desde)
        .limit(10);

      if (erroRecentes) throw erroDoBanco(erroRecentes);

      const duplicada = (recentes ?? []).some(
        (o) =>
          JSON.stringify([...(o.tipos_violencia ?? [])].sort()) ===
            JSON.stringify([...(dados.tipos_violencia ?? [])].sort()) &&
          (o.mensagem ?? null) === (dados.mensagem ?? null),
      );
      if (duplicada) {
        throw new HttpException(
          { erro: 'Esta ocorrência idêntica acabou de ser registrada.' },
          HttpStatus.CONFLICT,
        );
      }

      const { data, error } = await this.supabase
        .from('ocorrencias')
        .insert([
          {
            usuaria_id: dados.usuaria_id,
            tipos_violencia: dados.tipos_violencia,
            mensagem: dados.mensagem || null,
            latitude: dados.latitude ?? null,
            longitude: dados.longitude ?? null,
          },
        ])
        .select();

      if (error) {
        throw erroDoBanco(error);
      }

      this.avaliarRiscoUsuaria(dados.usuaria_id).catch(err =>
        this.logger.error('Falha silenciosa ao chamar IA', err instanceof Error ? err.stack : err)
      );

      return {
        mensagem: 'Ocorrência registrada com sucesso!',
        ocorrencia: data ? data[0] : null,
      };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível registrar a ocorrência.');
    }
  }

  private async avaliarRiscoUsuaria(usuariaId: string) {
    try {
      this.logger.log(`Iniciando análise de risco para usuária ${usuariaId}`);
      
      const { data: ocorrencias } = await this.supabase
        .from('ocorrencias')
        .select('*')
        .eq('usuaria_id', usuariaId)
        .order('criado_em', { ascending: false });

      const { count: qtdEmergencias } = await this.supabase
        .from('emergencias')
        .select('*', { count: 'exact', head: true })
        .eq('usuaria_id', usuariaId);

      const { data: usuaria } = await this.supabase
        .from('usuarias')
        .select('data_nascimento, nivel_risco')
        .eq('id', usuariaId)
        .single();

      const nivelRiscoAnterior = usuaria?.nivel_risco || null;

      const qtdOcorrencias = ocorrencias ? ocorrencias.length : 0;
      let teveFisica = 0, teveSexual = 0, teveAmeaca = 0;
      let diasUltimaOcorrencia = 999;
      let frequenciaAumentou = 0;

      if (qtdOcorrencias > 0 && ocorrencias) {
        for (const oc of ocorrencias) {
          const tipos = oc.tipos_violencia || [];
          if (tipos.includes('Física')) teveFisica = 1;
          if (tipos.includes('Sexual')) teveSexual = 1;
          if (tipos.includes('Ameaça')) teveAmeaca = 1;
        }

        const dataUltima = new Date(ocorrencias[0].criado_em);
        const diffTempo = Math.abs(new Date().getTime() - dataUltima.getTime());
        diasUltimaOcorrencia = Math.floor(diffTempo / (1000 * 60 * 60 * 24));
        
        if (qtdOcorrencias >= 2 && diasUltimaOcorrencia <= 30) {
           frequenciaAumentou = 1;
        }
      }

      let idade = 35;
      if (usuaria && usuaria.data_nascimento) {
         const nascimento = new Date(usuaria.data_nascimento);
         idade = new Date().getFullYear() - nascimento.getFullYear();
      }

      const payloadIA = {
        idade: idade,
        qtd_ocorrencias_totais: qtdOcorrencias,
        dias_desde_ultima_ocorrencia: diasUltimaOcorrencia,
        frequencia_aumentou: frequenciaAumentou,
        teve_viol_fisica: teveFisica,
        teve_viol_sexual: teveSexual,
        teve_ameaca: teveAmeaca,
        qtd_panico_acionado: qtdEmergencias || 0
      };

      const iaUrl = process.env.IA_SERVICE_URL || 'http://127.0.0.1:8000';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      let respostaIA: Response;
      try {
        respostaIA = await fetch(`${iaUrl}/classificar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.IA_SHARED_SECRET ? { 'X-Internal-Secret': process.env.IA_SHARED_SECRET } : {}),
          },
          body: JSON.stringify(payloadIA),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (respostaIA.ok) {
        const resultado = await respostaIA.json();
        await this.supabase
          .from('usuarias')
          .update({ nivel_risco: resultado.risco })
          .eq('id', usuariaId);

        if (resultado.risco === 'Alto' && nivelRiscoAnterior !== 'Alto') {
          const ultimaOcorrencia = qtdOcorrencias > 0 && ocorrencias ? ocorrencias[0] : null;
          await this.alertarGuardioes(usuariaId, ultimaOcorrencia);
        }
      }
    } catch (err) {
      this.logger.warn(`Análise de risco indisponível: ${err instanceof Error ? err.message : err}`);
    }
  }

  private async alertarGuardioes(usuariaId: string, ultimaOcorrencia: any) {
    try {
      const { data: guardioes, error: erroGuardioes } = await this.supabase
        .from('guardioes')
        .select('*')
        .eq('usuaria_id', usuariaId);

      if (erroGuardioes) throw erroDoBanco(erroGuardioes);

      const horario = new Date().toLocaleString('pt-BR');
      const temLocalizacao = ultimaOcorrencia?.latitude != null && ultimaOcorrencia?.longitude != null;
      const linkLocalizacao = temLocalizacao
        ? `https://www.google.com/maps?q=${ultimaOcorrencia.latitude},${ultimaOcorrencia.longitude}`
        : null;

      const mensagem = temLocalizacao
        ? `Alerta Amparo: o nível de risco de uma pessoa que você protege subiu para ALTO. Horário: ${horario}. Última localização registrada: ${linkLocalizacao}`
        : `Alerta Amparo: o nível de risco de uma pessoa que você protege subiu para ALTO. Horário: ${horario}. Localização não disponível no momento.`;

      if (!guardioes || guardioes.length === 0) {
        this.logger.warn(`Usuária ${usuariaId} atingiu risco ALTO, mas não possui guardiãs cadastradas.`);
      } else {
        this.logger.log(`🚨 Risco ALTO detectado para usuária ${usuariaId}!`);
        guardioes.forEach(guardiao => {
          this.logger.log(`Enviando [SMS/PUSH/WHATSAPP] para ${guardiao.nome_completo} (${guardiao.telefone}): ${mensagem}`);
        });
      }

      await this.supabase.from('alertas_risco').insert([{
        usuaria_id: usuariaId,
        nivel_risco: 'Alto',
        latitude: ultimaOcorrencia?.latitude ?? null,
        longitude: ultimaOcorrencia?.longitude ?? null,
        mensagem,
        guardioes_notificados: guardioes?.length || 0,
      }]);
    } catch (err) {
      this.logger.error('Falha ao alertar guardiãs sobre risco alto', err instanceof Error ? err.stack : err);
    }
  }

  async anexarEvidencia(ocorrenciaId: string, tipo: string, arquivo: any, usuariaIdAutenticada: string) {
    try {
      if (!arquivo) throw new HttpException({ erro: 'Nenhum arquivo enviado.' }, HttpStatus.BAD_REQUEST);

      const { data: ocorrencia, error: erroOcorrencia } = await this.supabase
        .from('ocorrencias')
        .select('id, usuaria_id')
        .eq('id', ocorrenciaId)
        .single();

      if (erroOcorrencia || !ocorrencia) {
        throw new HttpException({ erro: 'Ocorrência não encontrada.' }, HttpStatus.NOT_FOUND);
      }

      if (ocorrencia.usuaria_id !== usuariaIdAutenticada) {
        throw new HttpException({ erro: 'Acesso Negado: Esta ocorrência não pertence a você.' }, HttpStatus.FORBIDDEN);
      }

      const tamanhoMb = arquivo.size / (1024 * 1024);
      if (arquivo.mimetype.startsWith('image/') && tamanhoMb > 5) {
          throw new HttpException({ erro: 'Fotos não podem exceder 5MB.' }, HttpStatus.PAYLOAD_TOO_LARGE);
      }
      if (arquivo.mimetype.startsWith('audio/') && tamanhoMb > 10) {
          throw new HttpException({ erro: 'Áudios não podem exceder 10MB.' }, HttpStatus.PAYLOAD_TOO_LARGE);
      }
      if (arquivo.mimetype.startsWith('video/') && tamanhoMb > 20) {
          throw new HttpException({ erro: 'Vídeos não podem exceder 20MB.' }, HttpStatus.PAYLOAD_TOO_LARGE);
      }

      if (!conteudoCorrespondeAoMime(arquivo.buffer, arquivo.mimetype)) {
        throw new HttpException({ erro: 'O conteúdo do arquivo não corresponde ao tipo informado.' }, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      }

      const hashIntegridade = crypto.createHash('sha256').update(arquivo.buffer).digest('hex');

      const mapaExtensoes: Record<string, string> = {
        'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
        'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
        'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a'
      };
      const extensaoSegura = mapaExtensoes[arquivo.mimetype] || 'bin';
      const nomeSeguro = crypto.randomUUID();
      const caminhoStorage = ocorrencia.usuaria_id + '/' + ocorrenciaId + '/' + nomeSeguro + '.' + extensaoSegura;

      const { error: uploadError } = await this.supabase.storage
        .from('evidencias_amparo')
        .upload(caminhoStorage, arquivo.buffer, {
          contentType: arquivo.mimetype,
          upsert: false, 
        });

      if (uploadError) throw new Error("Falha no upload protegido para o Storage: " + uploadError.message);

      const { data: evidencia, error: evidenciaError } = await this.supabase
        .from('evidencias')
        .insert([{
            ocorrencia_id: ocorrenciaId,
            tipo: arquivo.mimetype.split('/')[0].toUpperCase(),
            caminho_storage: caminhoStorage,
            hash_integridade: hashIntegridade,
        }]).select();

      if (evidenciaError) {
        await this.supabase.storage.from('evidencias_amparo').remove([caminhoStorage]);
        throw erroDoBanco(evidenciaError);
      }

      return {
        mensagem: 'Evidência anexada e criptografada com segurança máxima!',
        evidencia: evidencia ? evidencia[0] : null,
      };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível anexar a evidência.');
    }
  }

  async listarPorUsuaria(usuariaId: string, limit = 20, offset = 0) {
    try {
      const { data, error, count } = await this.supabase
        .from('ocorrencias')
        .select('*, evidencias(*)', { count: 'exact' })
        .eq('usuaria_id', usuariaId)
        .order('criado_em', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw erroDoBanco(error);
      return { ocorrencias: data, total: count ?? 0, limit, offset };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível listar as ocorrências.');
    }
  }

  async remover(id: string, usuariaIdAutenticada: string) {
    try {
      const { data: ocorrencia } = await this.supabase.from('ocorrencias').select('usuaria_id').eq('id', id).single();
      if (!ocorrencia) throw new HttpException({ erro: 'Ocorrência não encontrada.' }, HttpStatus.NOT_FOUND);
      if (ocorrencia.usuaria_id !== usuariaIdAutenticada) throw new HttpException({ erro: 'Acesso Negado.' }, HttpStatus.FORBIDDEN);
      const { data: arquivos } = await this.supabase.from('evidencias').select('caminho_storage').eq('ocorrencia_id', id);
      const { data, error } = await this.supabase.from('ocorrencias').delete().eq('id', id).select();
      if (error) throw erroDoBanco(error);
      if (!data || data.length === 0) throw new HttpException({ erro: 'Ocorrência não encontrada.' }, HttpStatus.NOT_FOUND);

      const caminhos = (arquivos ?? []).map((a) => a.caminho_storage).filter(Boolean);
      if (caminhos.length > 0) {
        const { error: erroStorage } = await this.supabase.storage.from('evidencias_amparo').remove(caminhos);
        if (erroStorage) {
          this.logger.error(`Ocorrência ${id} removida, mas ${caminhos.length} arquivo(s) não foram apagados do Storage`, erroStorage.message);
        }
      }
      return { mensagem: 'Ocorrência removida com sucesso!' };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível remover a ocorrência.');
    }
  }
}

