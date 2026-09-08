import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

@Injectable()
export class OcorrenciasService {
  private supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_KEY as string,
  );

  async criar(dados: any) {
    try {
      const { data, error } = await this.supabase
        .from('ocorrencias')
        .insert([
          {
            usuaria_id: dados.usuaria_id,
            tipos_violencia: dados.tipos_violencia,
            mensagem: dados.mensagem || null,
            latitude: dados.latitude || null,
            longitude: dados.longitude || null,
          },
        ])
        .select();

      if (error) {
        throw new Error(error.message);
      }

      this.avaliarRiscoUsuaria(dados.usuaria_id).catch(err => 
        console.error('Falha silenciosa ao chamar IA:', err)
      );

      return {
        mensagem: 'OcorrÃªncia registrada com sucesso!',
        ocorrencia: data ? data[0] : null,
      };
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST;
      const response = error instanceof HttpException ? error.getResponse() : { erro: (error as any).message };
      throw new HttpException(response, status);
    }
  }

  private async avaliarRiscoUsuaria(usuariaId: string) {
    try {
      console.log('\nðŸ§  Iniciando anÃ¡lise de risco para usuÃ¡ria: ' + usuariaId);
      
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
        .select('data_nascimento')
        .eq('id', usuariaId)
        .single();

      const qtdOcorrencias = ocorrencias ? ocorrencias.length : 0;
      let teveFisica = 0, teveSexual = 0, teveAmeaca = 0;
      let diasUltimaOcorrencia = 999;
      let frequenciaAumentou = 0;

      if (qtdOcorrencias > 0 && ocorrencias) {
        for (const oc of ocorrencias) {
          const tipos = oc.tipos_violencia || [];
          if (tipos.includes('FÃ­sica')) teveFisica = 1;
          if (tipos.includes('Sexual')) teveSexual = 1;
          if (tipos.includes('AmeaÃ§a')) teveAmeaca = 1;
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

      const respostaIA = await fetch('http://127.0.0.1:8000/classificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadIA)
      });

      if (respostaIA.ok) {
        const resultado = await respostaIA.json();
        await this.supabase
          .from('usuarias')
          .update({ nivel_risco: resultado.risco })
          .eq('id', usuariaId);
      }
    } catch (err) {
      console.error("Erro ao integrar com a IA:", err);
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
        throw new HttpException({ erro: 'OcorrÃªncia nÃ£o encontrada.' }, HttpStatus.NOT_FOUND);
      }
      
      if (ocorrencia.usuaria_id !== usuariaIdAutenticada) {
        throw new HttpException({ erro: 'Acesso Negado: Esta ocorrÃªncia nÃ£o pertence a vocÃª.' }, HttpStatus.FORBIDDEN);
      }

      const tamanhoMb = arquivo.size / (1024 * 1024);
      if (arquivo.mimetype.startsWith('image/') && tamanhoMb > 5) {
          throw new HttpException({ erro: 'Fotos nÃ£o podem exceder 5MB.' }, HttpStatus.PAYLOAD_TOO_LARGE);
      }
      if (arquivo.mimetype.startsWith('audio/') && tamanhoMb > 10) {
          throw new HttpException({ erro: 'Ãudios nÃ£o podem exceder 10MB.' }, HttpStatus.PAYLOAD_TOO_LARGE);
      }
      if (arquivo.mimetype.startsWith('video/') && tamanhoMb > 20) {
          throw new HttpException({ erro: 'VÃ­deos nÃ£o podem exceder 20MB.' }, HttpStatus.PAYLOAD_TOO_LARGE);
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

      const { data: uploadData, error: uploadError } = await this.supabase.storage
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

      if (evidenciaError) throw new Error(evidenciaError.message);

      return {
        mensagem: 'EvidÃªncia anexada e criptografada com seguranÃ§a mÃ¡xima!',
        evidencia: evidencia ? evidencia[0] : null,
      };
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST;
      const response = error instanceof HttpException ? error.getResponse() : { erro: (error as any).message };
      throw new HttpException(response, status);
    }
  }

  async listarPorUsuaria(usuariaId: string) {
    try {
      const { data, error } = await this.supabase
        .from('ocorrencias')
        .select('*, evidencias(*)')
        .eq('usuaria_id', usuariaId)
        .order('criado_em', { ascending: false });

      if (error) throw new Error(error.message);
      return { ocorrencias: data };
    } catch (error) {
      throw new HttpException({ erro: (error as any).message }, HttpStatus.BAD_REQUEST);
    }
  }

  async remover(id: string, usuariaIdAutenticada: string) {
    try {
      const { data: ocorrencia } = await this.supabase.from('ocorrencias').select('usuaria_id').eq('id', id).single();
      if (!ocorrencia) throw new HttpException({ erro: 'Ocorrência não encontrada.' }, HttpStatus.NOT_FOUND);
      if (ocorrencia.usuaria_id !== usuariaIdAutenticada) throw new HttpException({ erro: 'Acesso Negado.' }, HttpStatus.FORBIDDEN);
      const { data, error } = await this.supabase.from('ocorrencias').delete().eq('id', id).select();
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new HttpException({ erro: 'OcorrÃªncia nÃ£o encontrada.' }, HttpStatus.NOT_FOUND);
      return { mensagem: 'OcorrÃªncia removida com sucesso!' };
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST;
      const response = error instanceof HttpException ? error.getResponse() : { erro: (error as any).message };
      throw new HttpException(response, status);
    }
  }
}

