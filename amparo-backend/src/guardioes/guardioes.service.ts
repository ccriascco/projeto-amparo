import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { erroDoBanco, tratarErro } from '../common/erro.util';
import { normalizarTelefone } from '../common/validadores';
import { gerarToken, hashToken } from '../common/token.util';
import { MensagensService } from '../mensagens/mensagens.service';

const GUARDIA_DUPLICADA = { erro: 'Esta guardiã (telefone) já está cadastrada.' };

// Colunas devolvidas ao app: nunca o hash do token do convite
export const COLUNAS_GUARDIA =
  'id, usuaria_id, nome_completo, telefone, email, parentesco_relacao, status_convite, convidado_em, confirmado_em';

/** Dados de um convite novo: o token vai só na mensagem, o banco guarda o hash. */
function novoConvite() {
  const token = gerarToken();
  return {
    token,
    colunas: {
      convite_token_hash: hashToken(token),
      status_convite: 'PENDENTE',
      convidado_em: new Date().toISOString(),
      confirmado_em: null,
    },
  };
}

@Injectable()
export class GuardioesService {
  private supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  );

  constructor(private mensagens: MensagensService) {}

  async cadastrar(dados: any) {
    try {
      const { data: existentes, error: erroBusca } = await this.supabase
        .from('guardioes')
        .select('id, telefone')
        .eq('usuaria_id', dados.usuaria_id);

      if (erroBusca) throw erroDoBanco(erroBusca);

      if ((existentes ?? []).some((g) => normalizarTelefone(g.telefone) === normalizarTelefone(dados.telefone))) {
        throw new HttpException(GUARDIA_DUPLICADA, HttpStatus.CONFLICT);
      }

      if (existentes && existentes.length >= 5) {
        throw new HttpException(
          { erro: 'Limite máximo de 5 guardiões atingido.' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const convite = novoConvite();
      const { data, error } = await this.supabase
        .from('guardioes')
        .insert([
          {
            usuaria_id: dados.usuaria_id,
            nome_completo: dados.nome_completo,
            telefone: dados.telefone,
            email: dados.email,
            parentesco_relacao: dados.parentesco_relacao,
            ...convite.colunas,
          },
        ])
        .select(COLUNAS_GUARDIA)
        .single();

      if (error) {
        throw erroDoBanco(error);
      }

      this.mensagens.enviarConvite(dados.telefone, convite.token);
      return { mensagem: 'Guardião cadastrado com sucesso!', guardiao: data };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível cadastrar a guardiã.');
    }
  }

  async listarPorUsuaria(usuariaId: string) {
    try {
      const { data, error } = await this.supabase
        .from('guardioes')
        .select(COLUNAS_GUARDIA)
        .eq('usuaria_id', usuariaId);

      if (error) {
        throw erroDoBanco(error);
      }

      return { guardioes: data };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível listar as guardiãs.');
    }
  }

  async atualizar(id: string, dados: any, usuariaIdAutenticada: string) {
    try {
      const { data: alvo, error: erroAlvo } = await this.supabase
        .from('guardioes')
        .select('usuaria_id')
        .eq('id', id)
        .single();

      if (erroAlvo || !alvo) {
        throw new HttpException({ erro: 'Guardião não encontrado' }, HttpStatus.NOT_FOUND);
      }

      if (alvo.usuaria_id !== usuariaIdAutenticada) {
         throw new HttpException({ erro: 'Acesso Negado.' }, HttpStatus.FORBIDDEN);
      }

      let convite: ReturnType<typeof novoConvite> | null = null;
      if (dados.telefone) {
        const { data: outras, error: erroOutras } = await this.supabase
          .from('guardioes')
          .select('id, telefone')
          .eq('usuaria_id', usuariaIdAutenticada);
        if (erroOutras) throw erroDoBanco(erroOutras);
        if ((outras ?? []).some((g) => g.id !== id && normalizarTelefone(g.telefone) === normalizarTelefone(dados.telefone))) {
          throw new HttpException(GUARDIA_DUPLICADA, HttpStatus.CONFLICT);
        }
        // Telefone novo é outra pessoa (ou outro aparelho): o convite precisa ser confirmado de novo
        const atual = (outras ?? []).find((g) => g.id === id);
        if (atual && normalizarTelefone(atual.telefone) !== normalizarTelefone(dados.telefone)) convite = novoConvite();
      }

      const { data, error } = await this.supabase
        .from('guardioes')
        .update({
          nome_completo: dados.nome_completo,
          telefone: dados.telefone,
          email: dados.email,
          parentesco_relacao: dados.parentesco_relacao,
          ...(convite ? convite.colunas : {}),
        })
        .eq('id', id)
        .select(COLUNAS_GUARDIA);

      if (error) {
        throw erroDoBanco(error);
      }
      if (convite) this.mensagens.enviarConvite(dados.telefone, convite.token);

      return {
        mensagem: 'Guardião atualizado com sucesso!',
        guardiao: data[0],
      };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível atualizar a guardiã.');
    }
  }

  async remover(id: string, usuariaIdAutenticada: string) {
    try {
      // 1. Descobrir qual a usuaria_id desse guardiao
      const { data: guardiaoAlvo, error: erroAlvo } = await this.supabase
        .from('guardioes')
        .select('usuaria_id')
        .eq('id', id)
        .single();

      if (erroAlvo || !guardiaoAlvo) {
        throw new HttpException({ erro: 'Guardião não encontrado' }, HttpStatus.NOT_FOUND);
      }

      if (guardiaoAlvo.usuaria_id !== usuariaIdAutenticada) {
         throw new HttpException({ erro: 'Acesso Negado.' }, HttpStatus.FORBIDDEN);
      }

      // 2. Contar quantos guardioes a usuaria possui
      const { count: total, error: erroCount } = await this.supabase
        .from('guardioes')
        .select('*', { count: 'exact', head: true })
        .eq('usuaria_id', guardiaoAlvo.usuaria_id);

      if (erroCount) throw erroDoBanco(erroCount);

      // 3. Validar a Regra de Negocio
      if (total !== null && total <= 1) {
        throw new HttpException(
          { erro: 'Operação não permitida: a usuária precisa possuir pelo menos uma guardiã.' },
          HttpStatus.FORBIDDEN
        );
      }

      // 4. Se passou, excluir
      const { error } = await this.supabase
        .from('guardioes')
        .delete()
        .eq('id', id);

      if (error) {
        throw erroDoBanco(error);
      }

      return { mensagem: 'Guardiã removida com sucesso!' };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível remover a guardiã.');
    }
  }

  async reenviarConvite(id: string, usuariaIdAutenticada: string) {
    try {
      const { data: alvo, error: erroAlvo } = await this.supabase
        .from('guardioes')
        .select('usuaria_id, telefone, status_convite')
        .eq('id', id)
        .maybeSingle();
      if (erroAlvo) throw erroDoBanco(erroAlvo);
      if (!alvo) throw new HttpException({ erro: 'Guardião não encontrado' }, HttpStatus.NOT_FOUND);
      if (alvo.usuaria_id !== usuariaIdAutenticada) throw new HttpException({ erro: 'Acesso Negado.' }, HttpStatus.FORBIDDEN);
      if (alvo.status_convite === 'CONFIRMADO') {
        throw new HttpException({ erro: 'Esta guardiã já confirmou o convite.' }, HttpStatus.BAD_REQUEST);
      }
      const convite = novoConvite();
      const { data, error } = await this.supabase.from('guardioes').update(convite.colunas).eq('id', id).select(COLUNAS_GUARDIA);
      if (error) throw erroDoBanco(error);
      this.mensagens.enviarConvite(alvo.telefone, convite.token);
      return { mensagem: 'Convite reenviado.', guardiao: data[0] };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível reenviar o convite.');
    }
  }

  /** Página pública do convite: busca pelo token recebido na mensagem. */
  async buscarConvite(token: string) {
    const { data, error } = await this.supabase
      .from('guardioes')
      .select('id, usuaria_id, status_convite')
      .eq('convite_token_hash', hashToken(token))
      .maybeSingle();
    if (error) throw erroDoBanco(error);
    if (!data) return null;
    const { data: usuaria, error: erroU } = await this.supabase.from('usuarias').select('nome_completo').eq('id', data.usuaria_id).maybeSingle();
    if (erroU) throw erroDoBanco(erroU);
    return { id: data.id as string, status: data.status_convite as string, primeiroNome: String(usuaria?.nome_completo ?? '').split(' ')[0] };
  }

  async confirmarConvite(token: string) {
    const convite = await this.buscarConvite(token);
    if (!convite) return null;
    if (convite.status !== 'CONFIRMADO') {
      const { error } = await this.supabase
        .from('guardioes')
        .update({ status_convite: 'CONFIRMADO', confirmado_em: new Date().toISOString() })
        .eq('id', convite.id);
      if (error) throw erroDoBanco(error);
    }
    return { ...convite, status: 'CONFIRMADO' };
  }
}
