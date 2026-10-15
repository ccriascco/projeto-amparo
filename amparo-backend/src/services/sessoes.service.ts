import { Injectable } from '@nestjs/common';
import { criarClienteSupabase } from '../config/supabase';
import { erroDoBanco } from '../utils/erro.util';
import { gerarToken, hashToken } from '../utils/token.util';

/** Validade da sessão do aparelho; é renovada a cada uso. */
export const DIAS_SESSAO = 30;
/** Códigos do disfarce errados seguidos antes de encerrar a sessão do aparelho. */
export const MAX_TENTATIVAS_CODIGO = 5;

export type Sessao = {
  id: string;
  usuaria_id: string;
  expira_em: string;
  tentativas_codigo: number;
};

function novaExpiracao(): string {
  return new Date(Date.now() + DIAS_SESSAO * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Sessão do aparelho (refresh token). Fica guardada só no celular da usuária;
 * no banco fica apenas o hash. Permite reabrir o app sem e-mail e senha e,
 * com o Modo Disfarce ligado, entrar só com o código de 4 números.
 */
@Injectable()
export class SessoesService {
  private supabase = criarClienteSupabase();

  async criar(usuariaId: string): Promise<{ id: string; refresh_token: string }> {
    const token = gerarToken();
    const agora = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('sessoes_aparelho')
      .insert([{ usuaria_id: usuariaId, token_hash: hashToken(token), expira_em: novaExpiracao(), ultimo_uso_em: agora }])
      .select('id')
      .single();
    if (error) throw erroDoBanco(error);
    return { id: data.id, refresh_token: token };
  }

  async buscarPorToken(token: string): Promise<Sessao | null> {
    const { data, error } = await this.supabase
      .from('sessoes_aparelho')
      .select('id, usuaria_id, expira_em, tentativas_codigo')
      .eq('token_hash', hashToken(token))
      .maybeSingle();
    if (error) throw erroDoBanco(error);
    return data;
  }

  async existe(id: string): Promise<boolean> {
    const { data, error } = await this.supabase.from('sessoes_aparelho').select('id').eq('id', id).maybeSingle();
    if (error) throw erroDoBanco(error);
    return !!data;
  }

  /** Troca o refresh token (o antigo deixa de valer) e estende a validade. */
  async rotacionar(id: string): Promise<string> {
    const token = gerarToken();
    const { error } = await this.supabase
      .from('sessoes_aparelho')
      .update({ token_hash: hashToken(token), expira_em: novaExpiracao(), ultimo_uso_em: new Date().toISOString(), tentativas_codigo: 0 })
      .eq('id', id);
    if (error) throw erroDoBanco(error);
    return token;
  }

  async registrarCodigoErrado(sessao: Sessao): Promise<number> {
    const tentativas = sessao.tentativas_codigo + 1;
    if (tentativas >= MAX_TENTATIVAS_CODIGO) {
      await this.apagar(sessao.id);
    } else {
      const { error } = await this.supabase.from('sessoes_aparelho').update({ tentativas_codigo: tentativas }).eq('id', sessao.id);
      if (error) throw erroDoBanco(error);
    }
    return tentativas;
  }

  async apagar(id: string): Promise<void> {
    const { error } = await this.supabase.from('sessoes_aparelho').delete().eq('id', id);
    if (error) throw erroDoBanco(error);
  }

  /** Encerra as sessões dos outros aparelhos (ex.: depois de trocar a senha). */
  async apagarOutras(usuariaId: string, manterId?: string): Promise<void> {
    const { data, error } = await this.supabase.from('sessoes_aparelho').select('id').eq('usuaria_id', usuariaId);
    if (error) throw erroDoBanco(error);
    const ids = (data ?? []).map((s) => s.id).filter((id) => id !== manterId);
    if (ids.length === 0) return;
    const { error: erroApagar } = await this.supabase.from('sessoes_aparelho').delete().in('id', ids);
    if (erroApagar) throw erroDoBanco(erroApagar);
  }
}
