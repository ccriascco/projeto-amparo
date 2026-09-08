import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UsuariasService {
  private supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_KEY as string,
  );

  constructor(private jwtService: JwtService) {}

  async cadastrar(dados: any) {
    try {
      if (!dados.guardioes || !Array.isArray(dados.guardioes) || dados.guardioes.length === 0) {
        throw new HttpException(
          { erro: 'A usuária precisa cadastrar no mínimo 1 guardiã.' },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      if (dados.guardioes.length > 5) {
        throw new HttpException(
          { erro: 'O limite máximo é de 5 guardiãs no cadastro.' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const salt = await bcrypt.genSalt(10);
      const senhaHash = await bcrypt.hash(dados.senha, salt);
      const senhaAppHash = await bcrypt.hash(dados.senha_app, salt);

      // 1. Criar Usuária
      const { data: usuariaData, error: usuariaError } = await this.supabase.from('usuarias').insert([
        {
          cpf: dados.cpf,
          email: dados.email,
          telefone: dados.telefone,
          nome_completo: dados.nome_completo,
          data_nascimento: dados.data_nascimento,
          senha_hash: senhaHash,
          senha_app: senhaAppHash,
          modo_disfarcado: dados.modo_disfarcado || false,
        },
      ]).select().single();

      if (usuariaError) {
        throw new Error(usuariaError.message);
      }

      // 2. Criar Guardiãs Vinculadas
      const guardioesFormatados = dados.guardioes.map((g: any) => ({
        usuaria_id: usuariaData.id,
        nome_completo: g.nome_completo,
        telefone: g.telefone,
        email: g.email || null,
        parentesco_relacao: g.parentesco_relacao || null,
      }));

      const { error: guardioesError } = await this.supabase.from('guardioes').insert(guardioesFormatados);

      // Rollback manual caso falhe
      if (guardioesError) {
        await this.supabase.from('usuarias').delete().eq('id', usuariaData.id);
        throw new Error("Falha ao salvar guardiãs: " + guardioesError.message);
      }

      return { mensagem: 'Usuária e guardiã(s) cadastradas com sucesso!', usuaria_id: usuariaData.id };
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST;
      const response = error instanceof HttpException ? error.getResponse() : { erro: (error as any).message };
      throw new HttpException(response, status);
    }
  }

  async login(dados: any) {
    try {
      const { data, error } = await this.supabase
        .from('usuarias')
        .select('*')
        .eq('email', dados.email)
        .single();

      if (error || !data) {
        throw new HttpException(
          { erro: 'E-mail ou senha inválidos' },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const senhaValidada = await bcrypt.compare(dados.senha, data.senha_hash);

      if (!senhaValidada) {
        throw new HttpException(
          { erro: 'E-mail ou senha inválidos' },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const payload = { sub: data.id };
      const accessToken = await this.jwtService.signAsync(payload);

      return {
        mensagem: 'Login realizado com sucesso! 🛡️',
        access_token: accessToken,
        usuaria: {
          id: data.id,
          nome_completo: data.nome_completo,
          email: data.email,
          modo_disfarcado: data.modo_disfarcado,
        },
      };
    } catch (error) {
      throw new HttpException(
        { erro: (error as any).message || 'Erro ao realizar login' },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
