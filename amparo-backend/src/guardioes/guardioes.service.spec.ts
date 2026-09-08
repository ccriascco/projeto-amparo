import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class GuardioesService {
  private supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_KEY as string,
  );

  // Cadastrar um novo guardião para a usuária
  async cadastrar(dados: any) {
    try {
      // Opcional: Verificar quantos guardões a usuária já tem (limite sugerido de até 5)
      const { data: existentes, error: erroBusca } = await this.supabase
        .from('guardioes')
        .select('id')
        .eq('usuaria_id', dados.usuaria_id);

      if (erroBusca) throw new Error(erroBusca.message);

      if (existentes && existentes.length >= 5) {
        throw new HttpException(
          { erro: 'Limite máximo de 5 guardiões atingido.' },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Inserir o guardião no Supabase
      const { data, error } = await this.supabase.from('guardioes').insert([
        {
          usuaria_id: dados.usuaria_id,
          nome_completo: dados.nome_completo,
          telefone: dados.telefone,
          email: dados.email,
          parentesco_relacao: dados.parentesco_relacao,
        },
      ]);

      if (error) {
        throw new Error(error.message);
      }

      return { mensagem: 'Guardião cadastrado com sucesso!' };
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST;
      const response = error instanceof HttpException ? error.getResponse() : { erro: (error as any).message };
      throw new HttpException(response, status);
    }
  }

  // Listar guardiões de uma usuária específica
  async listarPorUsuaria(usuariaId: string) {
    try {
      const { data, error } = await this.supabase
        .from('guardioes')
        .select('*')
        .eq('usuaria_id', usuariaId);

      if (error) {
        throw new Error(error.message);
      }

      return { guardioes: data };
    } catch (error) {
      throw new HttpException({ erro: (error as any).message }, HttpStatus.BAD_REQUEST);
    }
  }
}