import * as bcrypt from 'bcrypt';
import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { mascararCpf, UsuariasService } from './usuarias.service';
import { SessoesService } from './sessoes.service';
import { hashToken } from '../utils/token.util';
import { BancoMemoria } from '../../test/support/supabase-memoria';

const GUARDIA = { nome_completo: 'Guardiã Um', telefone: '11988887777' };

function dadosCadastro(extra: Record<string, unknown> = {}) {
  return {
    cpf: '52998224725',
    email: 'ana@amparo.test',
    telefone: '11999998888',
    nome_completo: 'Ana Teste',
    data_nascimento: '1995-01-01',
    senha: 'Amparo#2026',
    guardioes: [GUARDIA],
    ...extra,
  };
}

describe('UsuariasService', () => {
  let banco: BancoMemoria;
  let service: UsuariasService;
  let sessoes: SessoesService;
  let jwt: JwtService;
  let tokens: { revogar: jest.Mock };
  let google: { verificar: jest.Mock };
  let mensagens: { enviarConvite: jest.Mock; enviarPedidoDeAjuda: jest.Mock };

  beforeEach(() => {
    banco = new BancoMemoria();
    jwt = new JwtService({ secret: 'segredo-de-teste' });
    tokens = { revogar: jest.fn().mockResolvedValue(undefined) };
    google = { verificar: jest.fn() };
    mensagens = { enviarConvite: jest.fn(), enviarPedidoDeAjuda: jest.fn() };
    sessoes = new SessoesService();
    (sessoes as any).supabase = banco.cliente();
    service = new UsuariasService(jwt, tokens as any, sessoes, google as any, mensagens as any);
    (service as any).supabase = banco.cliente();
  });

  const usuaria = () => banco.tabelas.usuarias[0];
  const sidDe = (token: string) => (jwt.decode(token) as any).sid as string;

  describe('cadastrar', () => {
    it('recusa cadastro sem nenhuma guardiã (RN01)', async () => {
      await expect(service.cadastrar(dadosCadastro({ guardioes: [] }))).rejects.toMatchObject({
        response: { erro: 'A usuária precisa cadastrar no mínimo 1 guardiã.' },
      });
    });

    it('recusa cadastro com mais de 5 guardiãs (RN02)', async () => {
      const guardioes = Array.from({ length: 6 }, (_, i) => ({ nome_completo: `G${i}`, telefone: `1198888000${i}` }));
      await expect(service.cadastrar(dadosCadastro({ guardioes }))).rejects.toMatchObject({
        response: { erro: 'O limite máximo é de 5 guardiãs no cadastro.' },
      });
    });

    it('cria a conta, guarda só hashes e já devolve a sessão do aparelho', async () => {
      const r = await service.cadastrar(dadosCadastro({ modo_disfarcado: true, codigo_disfarce: '1207' }));

      expect(r.usuaria_id).toBe(usuaria().id);
      expect(r.access_token).toBeTruthy();
      expect(r.refresh_token).toBeTruthy();
      expect(await bcrypt.compare('Amparo#2026', usuaria().senha_hash)).toBe(true);
      expect(await bcrypt.compare('1207', usuaria().codigo_disfarce_hash)).toBe(true);
      expect(usuaria().modo_disfarcado).toBe(true);
      expect(banco.tabelas.sessoes_aparelho).toHaveLength(1);
      expect(banco.tabelas.sessoes_aparelho[0].token_hash).toBe(hashToken(r.refresh_token));
    });

    it('cria cada guardiã com convite PENDENTE e envia o convite (simulado)', async () => {
      await service.cadastrar(dadosCadastro());
      const [g] = banco.tabelas.guardioes;
      expect(g.status_convite).toBe('PENDENTE');
      expect(g.convite_token_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(mensagens.enviarConvite).toHaveBeenCalledTimes(1);
      const [telefone, token] = mensagens.enviarConvite.mock.calls[0];
      expect(telefone).toBe(GUARDIA.telefone);
      expect(hashToken(token)).toBe(g.convite_token_hash);
    });

    it('no cadastro pelo Google usa o e-mail do Google e não exige senha', async () => {
      google.verificar.mockResolvedValue({ sub: 'g-123', email: 'ana.google@gmail.com', nome: 'Ana' });
      const dados = dadosCadastro({ google_id_token: 'tok', email: 'outro@x.com' });
      delete (dados as any).senha;

      await service.cadastrar(dados);

      expect(usuaria().email).toBe('ana.google@gmail.com');
      expect(usuaria().google_sub).toBe('g-123');
      expect(usuaria().senha_hash).toBeNull();
      expect(usuaria().senha_alterada_em).toBeNull();
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await service.cadastrar(dadosCadastro());
      banco.tabelas.sessoes_aparelho = [];
    });

    it('rejeita e-mail inexistente com mensagem genérica', async () => {
      await expect(service.login({ email: 'naoexiste@a.com', senha: 'x' })).rejects.toMatchObject({
        response: { erro: 'E-mail ou senha inválidos' },
      });
    });

    it('rejeita senha incorreta', async () => {
      await expect(service.login({ email: 'ana@amparo.test', senha: 'Errada#123' })).rejects.toMatchObject({ status: 401 });
    });

    it('conta só do Google não entra por e-mail e senha (mesma mensagem genérica)', async () => {
      usuaria().senha_hash = null;
      await expect(service.login({ email: 'ana@amparo.test', senha: '' })).rejects.toMatchObject({
        response: { erro: 'E-mail ou senha inválidos' },
      });
    });

    it('autentica e abre uma sessão do aparelho ligada ao token de acesso', async () => {
      const r = await service.login({ email: 'ana@amparo.test', senha: 'Amparo#2026' });
      expect(r.usuaria.id).toBe(usuaria().id);
      expect(banco.tabelas.sessoes_aparelho).toHaveLength(1);
      expect(sidDe(r.access_token)).toBe(banco.tabelas.sessoes_aparelho[0].id);
    });
  });

  describe('renovarSessao', () => {
    it('sem Modo Disfarce renova sem código e troca o refresh token (o antigo deixa de valer)', async () => {
      const { refresh_token } = await service.cadastrar(dadosCadastro());
      const r = await service.renovarSessao(refresh_token);
      expect(r.access_token).toBeTruthy();
      expect(r.refresh_token).not.toBe(refresh_token);
      await expect(service.renovarSessao(refresh_token)).rejects.toMatchObject({ status: 401, response: { sessao_encerrada: true } });
    });

    it('com Modo Disfarce exige o código de 4 números', async () => {
      const { refresh_token } = await service.cadastrar(dadosCadastro({ modo_disfarcado: true, codigo_disfarce: '1207' }));
      await expect(service.renovarSessao(refresh_token)).rejects.toMatchObject({ status: 401, response: { precisa_codigo: true } });
      const r = await service.renovarSessao(refresh_token, '1207');
      expect(r.access_token).toBeTruthy();
    });

    it('código errado informa as tentativas restantes; o 5º erro encerra a sessão do aparelho', async () => {
      let { refresh_token } = await service.cadastrar(dadosCadastro({ modo_disfarcado: true, codigo_disfarce: '1207' }));
      for (let i = 1; i <= 4; i++) {
        await expect(service.renovarSessao(refresh_token, '0000')).rejects.toMatchObject({
          response: { erro: 'Código incorreto.', tentativas_restantes: 5 - i },
        });
      }
      await expect(service.renovarSessao(refresh_token, '0000')).rejects.toMatchObject({ response: { sessao_encerrada: true } });
      expect(banco.tabelas.sessoes_aparelho).toHaveLength(0);
      // nem o código certo funciona mais: precisa entrar com e-mail e senha
      await expect(service.renovarSessao(refresh_token, '1207')).rejects.toMatchObject({ status: 401 });
      refresh_token = (await service.login({ email: 'ana@amparo.test', senha: 'Amparo#2026' })).refresh_token;
      await expect(service.renovarSessao(refresh_token, '1207')).resolves.toBeDefined();
    });

    it('com o disfarce desligado, um código enviado também é conferido (calculadora do cabeçalho)', async () => {
      const { refresh_token } = await service.cadastrar(dadosCadastro({ codigo_disfarce: '1207' }));
      await expect(service.renovarSessao(refresh_token, '0000')).rejects.toMatchObject({ response: { erro: 'Código incorreto.' } });
      const r = await service.renovarSessao(refresh_token, '1207');
      await expect(service.renovarSessao(r.refresh_token)).resolves.toBeDefined();
    });

    it('acerto do código zera as tentativas', async () => {
      const { refresh_token } = await service.cadastrar(dadosCadastro({ modo_disfarcado: true, codigo_disfarce: '1207' }));
      await expect(service.renovarSessao(refresh_token, '0000')).rejects.toBeDefined();
      const r = await service.renovarSessao(refresh_token, '1207');
      expect(banco.tabelas.sessoes_aparelho[0].tentativas_codigo).toBe(0);
      expect(r.refresh_token).toBeTruthy();
    });

    it('sessão expirada é encerrada', async () => {
      const { refresh_token } = await service.cadastrar(dadosCadastro());
      banco.tabelas.sessoes_aparelho[0].expira_em = new Date(Date.now() - 1000).toISOString();
      await expect(service.renovarSessao(refresh_token)).rejects.toMatchObject({ response: { sessao_encerrada: true } });
      expect(banco.tabelas.sessoes_aparelho).toHaveLength(0);
    });
  });

  describe('loginGoogle', () => {
    it('entra pela identidade do Google já vinculada', async () => {
      google.verificar.mockResolvedValue({ sub: 'g-1', email: 'ana@amparo.test', nome: 'Ana' });
      await service.cadastrar(dadosCadastro());
      usuaria().google_sub = 'g-1';
      const r = await service.loginGoogle('tok');
      expect(r.usuaria.id).toBe(usuaria().id);
    });

    it('vincula o Google a uma conta existente com o mesmo e-mail verificado', async () => {
      await service.cadastrar(dadosCadastro());
      google.verificar.mockResolvedValue({ sub: 'g-2', email: 'ana@amparo.test', nome: 'Ana' });
      await service.loginGoogle('tok');
      expect(usuaria().google_sub).toBe('g-2');
    });

    it('sem conta, devolve 404 com os dados para completar o cadastro', async () => {
      google.verificar.mockResolvedValue({ sub: 'g-3', email: 'nova@gmail.com', nome: 'Nova Pessoa' });
      await expect(service.loginGoogle('tok')).rejects.toMatchObject({
        status: 404,
        response: { precisa_cadastro: true, email: 'nova@gmail.com', nome_completo: 'Nova Pessoa' },
      });
    });

    it('token do Google recusado vira 401', async () => {
      google.verificar.mockRejectedValue(new HttpException({ erro: 'x' }, HttpStatus.UNAUTHORIZED));
      await expect(service.loginGoogle('tok')).rejects.toMatchObject({ status: 401 });
    });
  });

  describe('logout', () => {
    it('revoga o jti e encerra a sessão do aparelho', async () => {
      const r = await service.cadastrar(dadosCadastro());
      const exp = Math.floor(Date.now() / 1000) + 3600;
      await service.logout(r.usuaria_id, 'jti-123', exp, sidDe(r.access_token));
      expect(tokens.revogar).toHaveBeenCalledWith('jti-123', r.usuaria_id, new Date(exp * 1000));
      expect(banco.tabelas.sessoes_aparelho).toHaveLength(0);
    });
  });

  describe('perfil e alterações', () => {
    let id: string;
    let sid: string;
    beforeEach(async () => {
      const r = await service.cadastrar(dadosCadastro());
      id = r.usuaria_id;
      sid = sidDe(r.access_token);
    });

    it('mascara o CPF e nunca devolve hashes', async () => {
      const p = await service.perfil(id);
      expect(p.cpf_mascarado).toBe('529.***.***-25');
      expect(p).toMatchObject({ tem_senha: true, login_google: false, modo_disfarcado: false, codigo_disfarce_definido: false });
      expect(JSON.stringify(p)).not.toMatch(/hash|52998224725/);
    });

    it('não liga o Modo Disfarce sem código definido', async () => {
      await expect(service.atualizarPerfil(id, { modo_disfarcado: true })).rejects.toMatchObject({
        status: 400,
        response: { precisa_codigo: true },
      });
      const r = await service.atualizarPerfil(id, { modo_disfarcado: true, codigo_disfarce: '4321' });
      expect(r.usuaria).toMatchObject({ modo_disfarcado: true, codigo_disfarce_definido: true });
    });

    it('e-mail já usado por outra conta vira 409', async () => {
      await service.cadastrar(dadosCadastro({ cpf: '11144477735', email: 'outra@amparo.test' }));
      await expect(service.atualizarPerfil(id, { email: 'outra@amparo.test' })).rejects.toMatchObject({ status: 409 });
    });

    it('troca de senha exige a atual, mantém este aparelho e encerra os outros', async () => {
      await service.login({ email: 'ana@amparo.test', senha: 'Amparo#2026' });
      expect(banco.tabelas.sessoes_aparelho).toHaveLength(2);

      await expect(service.trocarSenha(id, sid, 'Errada#1', 'Nova#Senha9')).rejects.toMatchObject({ status: 401 });
      await expect(service.trocarSenha(id, sid, 'Amparo#2026', 'Amparo#2026')).rejects.toMatchObject({ status: 400 });
      await service.trocarSenha(id, sid, 'Amparo#2026', 'Nova#Senha9');

      expect(banco.tabelas.sessoes_aparelho.map((s) => s.id)).toEqual([sid]);
      expect(await bcrypt.compare('Nova#Senha9', usuaria().senha_hash)).toBe(true);
      expect(usuaria().senha_alterada_em).toBeTruthy();
    });

    it('troca de código confere o código atual', async () => {
      await service.trocarCodigo(id, undefined, '1111');
      await expect(service.trocarCodigo(id, '9999', '2222')).rejects.toMatchObject({ status: 401 });
      await service.trocarCodigo(id, '1111', '2222');
      expect(await bcrypt.compare('2222', usuaria().codigo_disfarce_hash)).toBe(true);
    });
  });

  describe('excluirConta', () => {
    it('recusa exclusão com senha incorreta e não apaga nada', async () => {
      const r = await service.cadastrar(dadosCadastro());
      await expect(service.excluirConta(r.usuaria_id, { senha: 'errada' })).rejects.toMatchObject({ status: 401 });
      expect(banco.tabelas.usuarias).toHaveLength(1);
    });

    it('apaga conta, guardiãs, sessões e arquivos do Storage', async () => {
      const r = await service.cadastrar(dadosCadastro());
      banco.tabelas.ocorrencias.push({ id: 'oc1', usuaria_id: r.usuaria_id });
      banco.tabelas.evidencias.push({ id: 'ev1', ocorrencia_id: 'oc1', caminho_storage: 'u1/oc1/a.jpg' });
      banco.storage.evidencias_amparo.set('u1/oc1/a.jpg', { conteudo: Buffer.from('x') });

      await expect(service.excluirConta(r.usuaria_id, { senha: 'Amparo#2026' })).resolves.toEqual({ mensagem: 'Conta apagada permanentemente.' });
      for (const t of ['usuarias', 'guardioes', 'sessoes_aparelho', 'ocorrencias', 'evidencias']) {
        expect(banco.tabelas[t]).toHaveLength(0);
      }
      expect(banco.storage.evidencias_amparo.size).toBe(0);
    });

    it('conta só do Google confirma a exclusão com o Google', async () => {
      google.verificar.mockResolvedValue({ sub: 'g-9', email: 'g@gmail.com', nome: 'G' });
      const dados = dadosCadastro({ google_id_token: 'tok' });
      delete (dados as any).senha;
      const r = await service.cadastrar(dados);
      google.verificar.mockResolvedValue({ sub: 'outra-pessoa', email: 'x@gmail.com', nome: 'X' });
      await expect(service.excluirConta(r.usuaria_id, { google_id_token: 'tok' })).rejects.toMatchObject({ status: 401 });
      google.verificar.mockResolvedValue({ sub: 'g-9', email: 'g@gmail.com', nome: 'G' });
      await expect(service.excluirConta(r.usuaria_id, { google_id_token: 'tok' })).resolves.toBeDefined();
    });
  });

  it('mascararCpf mostra só os 3 primeiros e os 2 últimos dígitos', () => {
    expect(mascararCpf('24812345619')).toBe('248.***.***-19');
    expect(mascararCpf(null)).toBe('***.***.***-**');
  });
});
