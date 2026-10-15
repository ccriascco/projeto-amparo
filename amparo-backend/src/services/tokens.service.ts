import { Injectable } from '@nestjs/common';
import { criarClienteSupabase } from '../config/supabase';
import { erroDoBanco } from '../utils/erro.util';

@Injectable()
export class TokensService {
  private supabase = criarClienteSupabase();

  async revogar(jti: string, usuariaId: string, expiraEm: Date): Promise<void> {
    const { error } = await this.supabase
      .from('tokens_revogados')
      .insert([{ jti, usuaria_id: usuariaId, expira_em: expiraEm.toISOString() }]);
    if (error) throw erroDoBanco(error);

    // Token expirado já é recusado pela assinatura; manter a linha só guardaria dado à toa.
    await this.supabase.from('tokens_revogados').delete().lt('expira_em', new Date().toISOString());
  }

  async estaRevogado(jti: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('tokens_revogados')
      .select('jti')
      .eq('jti', jti)
      .maybeSingle();
    if (error) throw erroDoBanco(error);
    return !!data;
  }

  async usuariaExiste(usuariaId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('usuarias')
      .select('id')
      .eq('id', usuariaId)
      .maybeSingle();
    if (error) throw erroDoBanco(error);
    return !!data;
  }
}
