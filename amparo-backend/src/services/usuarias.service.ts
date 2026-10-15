import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { erroDoBanco, tratarErro } from '../utils/erro.util';
import { gerarToken, hashToken } from '../utils/token.util';
import { TokensService } from './tokens.service';
import { MAX_TENTATIVAS_CODIGO, SessoesService } from './sessoes.service';
import { GoogleService } from './google.service';
import { MensagensService } from './mensagens.service';

const CREDENCIAIS_INVALIDAS = { erro: 'E-mail ou senha inválidos' };

type UsuariaBanco = {
  id: string;
  nome_completo: string;
  email: string;
  modo_disfarcado: boolean;
  senha_hash: string | null;
  codigo_disfarce_hash: string | null;
  google_sub: string | null;
};

/** CPF exibido na conta: só os 3 primeiros e os 2 últimos dígitos (ex.: 248.***.***-19). */
export function mascararCpf(cpf: string | null | undefined): string {
  const d = String(cpf ?? '').replace(/\D/g, '');
  if (d.length !== 11) return '***.***.***-**';
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
}

@Injectable()
export class UsuariasService {
  private supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  );

  private readonly logger = new Logger(UsuariasService.name);

  constructor(
    private jwtService: JwtService,
    private tokens: TokensService,
    private sessoes: SessoesService,
    private google: GoogleService,
    private mensagens: MensagensService,
  ) {}

  /* ---------------- cadastro e login ---------------- */

  async cadastrar(dados: any) {
    try {
      if (!dados.guardioes || !Array.isArray(dados.guardioes) || dados.guardioes.length === 0) {
        throw new HttpException({ erro: 'A usuária precisa cadastrar no mínimo 1 guardiã.' }, HttpStatus.BAD_REQUEST);
      }
      if (dados.guardioes.length > 5) {
        throw new HttpException({ erro: 'O limite máximo é de 5 guardiãs no cadastro.' }, HttpStatus.BAD_REQUEST);
      }

      // Cadastro pelo Google: o e-mail e o identificador vêm do token conferido, não do formulário
      let googleSub: string | null = null;
      let email: string = dados.email;
      if (dados.google_id_token) {
        const identidade = await this.google.verificar(dados.google_id_token);
        googleSub = identidade.sub;
        email = identidade.email;
      }

      const senhaHash = dados.senha ? await bcrypt.hash(dados.senha, 10) : null;
      const codigoHash = dados.codigo_disfarce ? await bcrypt.hash(dados.codigo_disfarce, 10) : null;

      const convites: Array<{ telefone: string; token: string }> = [];
      const guardioesFormatados = dados.guardioes.map((g: any) => {
        const token = gerarToken();
        convites.push({ telefone: g.telefone, token });
        return {
          nome_completo: g.nome_completo,
          telefone: g.telefone,
          email: g.email || null,
          parentesco_relacao: g.parentesco_relacao || null,
          convite_token_hash: hashToken(token),
        };
      });

      // Usuária e guardiãs são criadas numa única transação no banco (RPC):
      // se qualquer parte falhar, tudo é desfeito pelo Postgres.
      const { data: usuariaId, error } = await this.supabase.rpc('cadastrar_usuaria_com_guardioes', {
        p_cpf: dados.cpf,
        p_email: email,
        p_telefone: dados.telefone,
        p_nome_completo: dados.nome_completo,
        p_data_nascimento: dados.data_nascimento,
        p_senha_hash: senhaHash,
        p_codigo_disfarce_hash: codigoHash,
        p_modo_disfarcado: dados.modo_disfarcado === true,
        p_google_sub: googleSub,
        p_guardioes: guardioesFormatados,
      });
      if (error) throw erroDoBanco(error);

      for (const c of convites) this.mensagens.enviarConvite(c.telefone, c.token);

      const sessao = await this.emitirSessao({
        id: usuariaId,
        nome_completo: dados.nome_completo,
        email,
        modo_disfarcado: dados.modo_disfarcado === true,
      });
      return { ...sessao, mensagem: 'Usuária e guardiã(s) cadastradas com sucesso!', usuaria_id: usuariaId };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível concluir o cadastro.');
    }
  }

  async login(dados: { email: string; senha: string }) {
    try {
      const usuaria = await this.buscarPorEmail(dados.email);
      // Contas criadas pelo Google sem senha não entram por e-mail e senha
      if (!usuaria?.senha_hash || !(await bcrypt.compare(dados.senha, usuaria.senha_hash))) {
        throw new HttpException(CREDENCIAIS_INVALIDAS, HttpStatus.UNAUTHORIZED);
      }
      return await this.emitirSessao(usuaria);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException({ erro: 'Erro ao realizar login' }, HttpStatus.UNAUTHORIZED);
    }
  }

  async loginGoogle(idToken: string) {
    try {
      const identidade = await this.google.verificar(idToken);
      let usuaria = await this.buscarUma('google_sub', identidade.sub);
      if (!usuaria) {
        // Conta já existente com o mesmo e-mail (verificado pelo Google): vincula ao Google
        usuaria = await this.buscarPorEmail(identidade.email);
        if (usuaria) {
          const { error } = await this.supabase.from('usuarias').update({ google_sub: identidade.sub }).eq('id', usuaria.id);
          if (error) throw erroDoBanco(error);
        }
      }
      if (!usuaria) {
        throw new HttpException(
          {
            erro: 'Ainda não existe uma conta Amparo com este Google. Complete seu cadastro.',
            precisa_cadastro: true,
            nome_completo: identidade.nome,
            email: identidade.email,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return await this.emitirSessao(usuaria);
    } catch (error) {
      throw tratarErro(error, 'Não foi possível entrar com o Google.');
    }
  }

  /**
   * Reabre a sessão do aparelho. Com o Modo Disfarce ligado, exige o código de 4 números;
   * 5 códigos errados seguidos encerram a sessão (aí só entra com e-mail e senha ou Google).
   */
  async renovarSessao(refreshToken: string, codigo?: string) {
    try {
      const sessao = await this.sessoes.buscarPorToken(refreshToken);
      if (!sessao || new Date(sessao.expira_em).getTime() <= Date.now()) {
        if (sessao) await this.sessoes.apagar(sessao.id);
        throw new HttpException({ erro: 'Sua sessão expirou. Entre de novo.', sessao_encerrada: true }, HttpStatus.UNAUTHORIZED);
      }
      const { data: usuaria, error } = await this.supabase
        .from('usuarias')
        .select('id, nome_completo, email, modo_disfarcado, codigo_disfarce_hash')
        .eq('id', sessao.usuaria_id)
        .maybeSingle();
      if (error) throw erroDoBanco(error);
      if (!usuaria) {
        await this.sessoes.apagar(sessao.id);
        throw new HttpException({ erro: 'Sua sessão expirou. Entre de novo.', sessao_encerrada: true }, HttpStatus.UNAUTHORIZED);
      }

      // O código é exigido com o disfarce ligado, e conferido sempre que o app o enviar
      // (a calculadora do cabeçalho também esconde o app com o disfarce desligado)
      if (usuaria.codigo_disfarce_hash && (usuaria.modo_disfarcado || codigo !== undefined)) {
        if (!codigo) {
          throw new HttpException({ erro: 'Digite o código do Modo Disfarce.', precisa_codigo: true }, HttpStatus.UNAUTHORIZED);
        }
        if (!(await bcrypt.compare(codigo, usuaria.codigo_disfarce_hash))) {
          const tentativas = await this.sessoes.registrarCodigoErrado(sessao);
          const restantes = MAX_TENTATIVAS_CODIGO - tentativas;
          if (restantes <= 0) {
            throw new HttpException(
              { erro: 'Código errado muitas vezes. Entre com e-mail e senha.', sessao_encerrada: true },
              HttpStatus.UNAUTHORIZED,
            );
          }
          throw new HttpException({ erro: 'Código incorreto.', tentativas_restantes: restantes }, HttpStatus.UNAUTHORIZED);
        }
      }

      const novoRefresh = await this.sessoes.rotacionar(sessao.id);
      return {
        mensagem: 'Sessão renovada.',
        access_token: await this.assinarAcesso(usuaria.id, sessao.id),
        refresh_token: novoRefresh,
        usuaria: { id: usuaria.id, nome_completo: usuaria.nome_completo, email: usuaria.email, modo_disfarcado: usuaria.modo_disfarcado },
      };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível reabrir a sessão.');
    }
  }

  async logout(usuariaId: string, jti: string, exp: number, sid?: string, refreshToken?: string) {
    await this.tokens.revogar(jti, usuariaId, new Date(exp * 1000));
    if (sid) {
      await this.sessoes.apagar(sid);
    } else if (refreshToken) {
      const sessao = await this.sessoes.buscarPorToken(refreshToken);
      if (sessao && sessao.usuaria_id === usuariaId) await this.sessoes.apagar(sessao.id);
    }
    return { mensagem: 'Logout realizado com sucesso.' };
  }

  /* ---------------- conta ---------------- */

  async perfil(usuariaId: string) {
    try {
      const { data, error } = await this.supabase
        .from('usuarias')
        .select('id, nome_completo, email, telefone, data_nascimento, cpf, modo_disfarcado, nivel_risco, senha_hash, codigo_disfarce_hash, google_sub, senha_alterada_em')
        .eq('id', usuariaId)
        .maybeSingle();
      if (error) throw erroDoBanco(error);
      if (!data) throw new HttpException({ erro: 'Conta não encontrada.' }, HttpStatus.NOT_FOUND);
      return {
        id: data.id,
        nome_completo: data.nome_completo,
        email: data.email,
        telefone: data.telefone,
        data_nascimento: data.data_nascimento,
        cpf_mascarado: mascararCpf(data.cpf),
        modo_disfarcado: !!data.modo_disfarcado,
        codigo_disfarce_definido: !!data.codigo_disfarce_hash,
        nivel_risco: data.nivel_risco ?? null,
        tem_senha: !!data.senha_hash,
        login_google: !!data.google_sub,
        senha_alterada_em: data.senha_alterada_em ?? null,
      };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível carregar sua conta.');
    }
  }

  async atualizarPerfil(usuariaId: string, dados: any) {
    try {
      const alteracoes: Record<string, unknown> = {};
      for (const campo of ['nome_completo', 'telefone', 'email'] as const) {
        if (dados[campo] !== undefined) alteracoes[campo] = dados[campo];
      }
      if (dados.codigo_disfarce !== undefined) {
        alteracoes.codigo_disfarce_hash = await bcrypt.hash(dados.codigo_disfarce, 10);
      }
      if (dados.modo_disfarcado !== undefined) {
        if (dados.modo_disfarcado === true && dados.codigo_disfarce === undefined) {
          const { data, error } = await this.supabase.from('usuarias').select('codigo_disfarce_hash').eq('id', usuariaId).maybeSingle();
          if (error) throw erroDoBanco(error);
          if (!data?.codigo_disfarce_hash) {
            throw new HttpException(
              { erro: 'Defina o código de 4 números antes de ligar o Modo Disfarce.', precisa_codigo: true },
              HttpStatus.BAD_REQUEST,
            );
          }
        }
        alteracoes.modo_disfarcado = dados.modo_disfarcado;
      }
      if (Object.keys(alteracoes).length === 0) {
        throw new HttpException({ erro: 'Nenhum dado para alterar.' }, HttpStatus.BAD_REQUEST);
      }
      const { error } = await this.supabase.from('usuarias').update(alteracoes).eq('id', usuariaId);
      if (error) throw erroDoBanco(error);
      return { mensagem: 'Dados atualizados.', usuaria: await this.perfil(usuariaId) };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível salvar seus dados.');
    }
  }

  async trocarSenha(usuariaId: string, sid: string | undefined, senhaAtual: string | undefined, novaSenha: string) {
    try {
      const { data, error } = await this.supabase.from('usuarias').select('senha_hash').eq('id', usuariaId).maybeSingle();
      if (error) throw erroDoBanco(error);
      if (!data) throw new HttpException({ erro: 'Conta não encontrada.' }, HttpStatus.NOT_FOUND);
      if (data.senha_hash) {
        if (!senhaAtual || !(await bcrypt.compare(senhaAtual, data.senha_hash))) {
          throw new HttpException({ erro: 'A senha atual está incorreta.' }, HttpStatus.UNAUTHORIZED);
        }
        if (await bcrypt.compare(novaSenha, data.senha_hash)) {
          throw new HttpException({ erro: 'A nova senha precisa ser diferente da atual.' }, HttpStatus.BAD_REQUEST);
        }
      }
      const { error: erroAtualizar } = await this.supabase
        .from('usuarias')
        .update({ senha_hash: await bcrypt.hash(novaSenha, 10), senha_alterada_em: new Date().toISOString() })
        .eq('id', usuariaId);
      if (erroAtualizar) throw erroDoBanco(erroAtualizar);
      // Ela continua conectada neste aparelho; os outros aparelhos precisam entrar de novo
      await this.sessoes.apagarOutras(usuariaId, sid);
      return { mensagem: 'Senha alterada. Os outros aparelhos precisarão entrar de novo.' };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível alterar a senha.');
    }
  }

  async trocarCodigo(usuariaId: string, codigoAtual: string | undefined, codigoNovo: string) {
    try {
      const { data, error } = await this.supabase.from('usuarias').select('codigo_disfarce_hash').eq('id', usuariaId).maybeSingle();
      if (error) throw erroDoBanco(error);
      if (!data) throw new HttpException({ erro: 'Conta não encontrada.' }, HttpStatus.NOT_FOUND);
      if (data.codigo_disfarce_hash && (!codigoAtual || !(await bcrypt.compare(codigoAtual, data.codigo_disfarce_hash)))) {
        throw new HttpException({ erro: 'O código atual não confere.' }, HttpStatus.UNAUTHORIZED);
      }
      const { error: erroAtualizar } = await this.supabase
        .from('usuarias')
        .update({ codigo_disfarce_hash: await bcrypt.hash(codigoNovo, 10) })
        .eq('id', usuariaId);
      if (erroAtualizar) throw erroDoBanco(erroAtualizar);
      return { mensagem: 'Código do Modo Disfarce alterado.' };
    } catch (error) {
      throw tratarErro(error, 'Não foi possível alterar o código.');
    }
  }

  async excluirConta(usuariaId: string, confirmacao: { senha?: string; google_id_token?: string }) {
    const { data: usuaria, error } = await this.supabase
      .from('usuarias')
      .select('senha_hash, google_sub')
      .eq('id', usuariaId)
      .maybeSingle();
    if (error) throw erroDoBanco(error);
    if (!usuaria) throw new HttpException({ erro: 'Conta não encontrada.' }, HttpStatus.NOT_FOUND);

    let confirmada = false;
    if (confirmacao.senha && usuaria.senha_hash) {
      confirmada = await bcrypt.compare(confirmacao.senha, usuaria.senha_hash);
    } else if (confirmacao.google_id_token && usuaria.google_sub) {
      const identidade = await this.google.verificar(confirmacao.google_id_token);
      confirmada = identidade.sub === usuaria.google_sub;
    }
    if (!confirmada) {
      throw new HttpException({ erro: usuaria.senha_hash ? 'Senha incorreta.' : 'Confirme com a sua conta Google.' }, HttpStatus.UNAUTHORIZED);
    }

    const { data: ocorrencias, error: erroOc } = await this.supabase.from('ocorrencias').select('id').eq('usuaria_id', usuariaId);
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

  /* ---------------- apoio ---------------- */

  private async buscarUma(coluna: 'email' | 'google_sub', valor: string): Promise<UsuariaBanco | null> {
    const { data, error } = await this.supabase
      .from('usuarias')
      .select('id, nome_completo, email, modo_disfarcado, senha_hash, codigo_disfarce_hash, google_sub')
      .eq(coluna, valor)
      .maybeSingle();
    if (error) throw erroDoBanco(error);
    return data;
  }

  private async buscarPorEmail(email: string): Promise<UsuariaBanco | null> {
    return (await this.buscarUma('email', email)) ?? (await this.buscarUma('email', email.toLowerCase()));
  }

  private async assinarAcesso(usuariaId: string, sessaoId: string): Promise<string> {
    return this.jwtService.signAsync({ sub: usuariaId, jti: randomUUID(), sid: sessaoId });
  }

  private async emitirSessao(u: { id: string; nome_completo: string; email: string; modo_disfarcado: boolean }) {
    const sessao = await this.sessoes.criar(u.id);
    return {
      mensagem: 'Login realizado com sucesso! 🛡️',
      access_token: await this.assinarAcesso(u.id, sessao.id),
      refresh_token: sessao.refresh_token,
      usuaria: { id: u.id, nome_completo: u.nome_completo, email: u.email, modo_disfarcado: !!u.modo_disfarcado },
    };
  }
}
