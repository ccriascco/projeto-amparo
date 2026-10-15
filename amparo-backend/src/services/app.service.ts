import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class AppService {
  async testarConexao() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return { erro: 'Chaves do Supabase não encontradas no arquivo .env' };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Só checa que o banco responde: nunca devolver linhas de usuárias aqui.
    const { count, error } = await supabase
      .from('usuarias')
      .select('id', { count: 'exact', head: true });

    if (error) {
      return { erro: 'Falha ao conectar com o banco de dados.' };
    }

    return {
      mensagem: 'Conexão com o Supabase realizada com sucesso! 🚀',
      total_usuarias: count ?? 0,
    };
  }
}
