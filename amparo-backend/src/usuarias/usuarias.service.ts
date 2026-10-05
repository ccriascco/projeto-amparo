import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { erroDoBanco, tratarErro } from '../common/erro.util';
import { randomUUID } from 'crypto';
import { Logger } from '@nestjs/common';
import { TokensService } from '../auth/tokens.service';

@Injectable()
export class UsuariasService {
  private supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  );

  private readonly logger = new Logger(UsuariasService.name);

  constructor(private jwtService: JwtService, private tokens: TokensService) {}

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

      const guardioesFormatados = dados.guardioes.map((g: any) => ({
        nome_completo: g.nome_completo,
        telefone: g.telefone,
        email: g.email || null,
        parentesco_relacao: g.parentesco_relacao || null,
      }));

      // Usuária e guardiãs são criadas numa única transação no banco
      // (função RPC cadastrar_usuaria_com_guardioes): se qualquer parte
      // falhar, tudo é desfeito automaticamente pelo Postgres.
      const { data: usuariaId, error } = await this.supabase.rpc('cadastrar_usuaria_com_guardioes', {
        p_cpf: dados.cpf,
        p_email: dados.email,
        p_telefone: dados.telefone,
        p_nome_completo: dados.nome_completo,
        p_data_nascimento: dados.data_nascimento,
        p_senha_hash: senhaHash,
        p_senha_app: senhaAppHash,
        p_modo_disfarcado: dados.modo_disfarcado || false,
        p_guardioes: guardioesFormatados,
      });

      if (error) {
        throw erroDoBanco(error);
      }

      return { mensagem: 'Usuária e guardiã(s) cadastradas com sucesso!', usuaria_id: usuariaId };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível concluir o cadastro.');
    }
  }

  async login(dados: any) {
    return this.autenticar(dados.email, dados.senha, 'senha_hash');
  }

  async loginDisfarcado(dados: any) {
    return this.autenticar(dados.email, dados.senha, 'senha_app');
  }

  private async autenticar(
    email: string,
    senhaDigitada: string,
    campoSenha: 'senha_hash' | 'senha_app',
  ) {
    try {
      const { data, error } = await this.supabase
        .from('usuarias')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data) {
        throw new HttpException(
          { erro: 'E-mail ou senha inválidos' },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const senhaValidada = await bcrypt.compare(senhaDigitada, data[campoSenha]);

      if (!senhaValidada) {
        throw new HttpException(
          { erro: 'E-mail ou senha inválidos' },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const payload = { sub: data.id, jti: randomUUID() };
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
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException({ erro: 'Erro ao realizar login' }, HttpStatus.UNAUTHORIZED);
    }
  }

  async logout(usuariaId: string, jti: string, exp: number) {
    await this.tokens.revogar(jti, usuariaId, new Date(exp * 1000));
    return { mensagem: 'Logout realizado com sucesso.' };
  }

  async excluirConta(usuariaId: string, senha: string) {
    const { data: usuaria, error } = await this.supabase
      .from('usuarias')
      .select('senha_hash')
      .eq('id', usuariaId)
      .maybeSingle();
    if (error) throw erroDoBanco(error);
    if (!usuaria || !(await bcrypt.compare(senha, usuaria.senha_hash))) {
      throw new HttpException({ erro: 'Senha incorreta.' }, HttpStatus.UNAUTHORIZED);
    }

    const { data: ocorrencias, error: erroOc } = await this.supabase
      .from('ocorrencias')
      .select('id')
      .eq('usuaria_id', usuariaId);
    if (erroOc) throw erroDoBanco(erroOc);
    const idsOcorrencias = (ocorrencias ?? []).map((o) => o.id);

    let caminhos: string[] = [];
    if (idsOcorrencias.length > 0) {
      const { data: evidencias, error: erroEv } = await this.supabase
        .from('evidencias')
        .select('caminho_storage')
        .in('ocorrencia_id', idsOcorrencias);
      if (erroEv) throw erroDoBanco(erroEv);
      caminhos = (evidencias ?? []).map((e) => e.caminho_storage).filter(Boolean);
    }

    const { error: erroApagar } = await this.supabase.rpc('apagar_conta_usuaria', { p_usuaria_id: usuariaId });
    if (erroApagar) throw erroDoBanco(erroApagar);

    if (caminhos.length > 0) {
      const { error: erroStorage } = await this.supabase.storage.from('evidencias_amparo').remove(caminhos);
      if (erroStorage) {
        this.logger.error(`Conta ${usuariaId} apagada, mas ${caminhos.length} arquivo(s) não foram removidos do Storage`, erroStorage.message);
      }
    }
    return { mensagem: 'Conta apagada permanentemente.' };
  }
}
