import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class AppService {
  async testarConexao() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return { erro: 'Chaves do Supabase não encontradas no arquivo .env' };
    }

    // Inicializa o cliente do Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Tenta fazer uma consulta na tabela de usuárias
    const { data, error } = await supabase.from('usuarias').select('*');

    if (error) {
      return { erro: `Falha ao conectar: ${error.message}` };
    }

    return {
      mensagem: 'Conexão com o Supabase realizada com sucesso! 🚀',
      usuarias_cadastradas: data,
    };
  }
}