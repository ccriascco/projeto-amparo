import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class GuardioesService {
  private supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_KEY as string,
  );

  async cadastrar(dados: any) {
    try {
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

      const { data, error } = await this.supabase
        .from('guardioes')
        .update({
          nome_completo: dados.nome_completo,
          telefone: dados.telefone,
          email: dados.email,
          parentesco_relacao: dados.parentesco_relacao,
        })
        .eq('id', id)
        .select();

      if (error) {
        throw new Error(error.message);
      }

      return {
        mensagem: 'Guardião atualizado com sucesso!',
        guardiao: data[0],
      };
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST;
      const response = error instanceof HttpException ? error.getResponse() : { erro: (error as any).message };
      throw new HttpException(response, status);
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

      if (erroCount) throw new Error(erroCount.message);

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
        throw new Error(error.message);
      }

      return { mensagem: 'Guardiã removida com sucesso!' };
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST;
      const response = error instanceof HttpException ? error.getResponse() : { erro: (error as any).message };
      throw new HttpException(response, status);
    }
  }
}
