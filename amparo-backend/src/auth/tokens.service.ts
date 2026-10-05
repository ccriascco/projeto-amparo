import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { erroDoBanco } from '../common/erro.util';

@Injectable()
export class TokensService {
  private supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  );

  async revogar(jti: string, usuariaId: string, expiraEm: Date): Promise<void> {
    const { error } = await this.supabase
      .from('tokens_revogados')
      .insert([{ jti, usuaria_id: usuariaId, expira_em: expiraEm.toISOString() }]);
    if (error) throw erroDoBanco(error);
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
