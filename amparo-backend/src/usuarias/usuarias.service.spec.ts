import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsuariasService } from './usuarias.service';

function criarSupabaseFake(respostas: any[]) {
  let indice = 0;
  const builder: any = {
    from: jest.fn(() => builder),
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    single: jest.fn(() => builder),
    maybeSingle: jest.fn(() => builder),
    in: jest.fn(() => builder),
    rpc: jest.fn(() => builder),
    // oxlint-disable-next-line unicorn/no-thenable
    then: (resolve: (v: any) => void) => resolve(respostas[indice++]),
  };
  return builder;
}

describe('UsuariasService', () => {
  let service: UsuariasService;
  let jwtService: JwtService;
  let tokens: any;

  beforeEach(() => {
    jwtService = { signAsync: jest.fn().mockResolvedValue('token-fake') } as any;
    tokens = { revogar: jest.fn().mockResolvedValue(undefined), estaRevogado: jest.fn(), usuariaExiste: jest.fn() } as any;
    service = new UsuariasService(jwtService, tokens);
  });

  describe('cadastrar', () => {
    it('recusa cadastro sem nenhuma guardiã (RN01)', async () => {
      await expect(
        service.cadastrar({
          cpf: '12345678901',
          email: 'a@a.com',
          senha: '12345678',
          senha_app: '12345678',
          guardioes: [],
        }),
      ).rejects.toMatchObject({
        response: { erro: 'A usuária precisa cadastrar no mínimo 1 guardiã.' },
      });
    });

    it('recusa cadastro com mais de 5 guardiãs (RN02)', async () => {
      const guardioes = Array.from({ length: 6 }, (_, i) => ({ nome_completo: `G${i}`, telefone: '111' }));

      await expect(
        service.cadastrar({
          cpf: '12345678901',
          email: 'a@a.com',
          senha: '12345678',
          senha_app: '12345678',
          guardioes,
        }),
      ).rejects.toMatchObject({
        response: { erro: 'O limite máximo é de 5 guardiãs no cadastro.' },
      });
    });

    it('cadastra via RPC transacional quando os dados são válidos', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: 'usuaria-id-123', error: null },
      ]);

      const resultado = await service.cadastrar({
        cpf: '12345678901',
        email: 'a@a.com',
        telefone: '11999998888',
        nome_completo: 'Teste',
        data_nascimento: '1995-01-01',
        senha: '12345678',
        senha_app: 'calc12345',
        guardioes: [{ nome_completo: 'G1', telefone: '11988887777' }],
      });

      expect(resultado).toEqual({
        mensagem: 'Usuária e guardiã(s) cadastradas com sucesso!',
        usuaria_id: 'usuaria-id-123',
      });
      expect((service as any).supabase.rpc).toHaveBeenCalledWith(
        'cadastrar_usuaria_com_guardioes',
        expect.objectContaining({ p_cpf: '12345678901' }),
      );
    });
  });

  describe('login', () => {
    it('rejeita e-mail inexistente com mensagem genérica (não revela se o e-mail existe)', async () => {
      (service as any).supabase = criarSupabaseFake([{ data: null, error: { message: 'not found' } }]);

      await expect(service.login({ email: 'naoexiste@a.com', senha: '123' })).rejects.toMatchObject({
        response: { erro: 'E-mail ou senha inválidos' },
      });
    });

    it('rejeita senha incorreta', async () => {
      const senhaHash = await bcrypt.hash('senhaCorreta', 10);
      (service as any).supabase = criarSupabaseFake([
        { data: { id: 'u1', senha_hash: senhaHash }, error: null },
      ]);

      await expect(service.login({ email: 'a@a.com', senha: 'senhaErrada' })).rejects.toMatchObject({
        response: { erro: 'E-mail ou senha inválidos' },
      });
    });

    it('autentica com sucesso e devolve token quando a senha confere', async () => {
      const senhaHash = await bcrypt.hash('senhaCorreta', 10);
      (service as any).supabase = criarSupabaseFake([
        {
          data: {
            id: 'u1',
            senha_hash: senhaHash,
            nome_completo: 'Teste',
            email: 'a@a.com',
            modo_disfarcado: false,
          },
          error: null,
        },
      ]);

      const resultado = await service.login({ email: 'a@a.com', senha: 'senhaCorreta' });

      expect(resultado.access_token).toBe('token-fake');
      expect(resultado.usuaria.id).toBe('u1');
    });
  });

  describe('loginDisfarcado (P14)', () => {
    it('rejeita quando a senha real é digitada no lugar da senha disfarçada', async () => {
      const senhaHash = await bcrypt.hash('senhaReal', 10);
      const senhaAppHash = await bcrypt.hash('calc1234', 10);
      (service as any).supabase = criarSupabaseFake([
        { data: { id: 'u1', senha_hash: senhaHash, senha_app: senhaAppHash }, error: null },
      ]);

      await expect(service.loginDisfarcado({ email: 'a@a.com', senha: 'senhaReal' })).rejects.toMatchObject({
        response: { erro: 'E-mail ou senha inválidos' },
      });
    });

    it('autentica com sucesso e devolve o MESMO formato de sessão do login normal', async () => {
      const senhaHash = await bcrypt.hash('senhaReal', 10);
      const senhaAppHash = await bcrypt.hash('calc1234', 10);
      (service as any).supabase = criarSupabaseFake([
        {
          data: {
            id: 'u1',
            senha_hash: senhaHash,
            senha_app: senhaAppHash,
            nome_completo: 'Teste',
            email: 'a@a.com',
            modo_disfarcado: false,
          },
          error: null,
        },
      ]);

      const resultado = await service.loginDisfarcado({ email: 'a@a.com', senha: 'calc1234' });

      expect(resultado.access_token).toBe('token-fake');
      expect(resultado.usuaria.id).toBe('u1');
    });
  });

  describe('logout (L-09)', () => {
    it('revoga o jti do token atual com a mesma expiração', async () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      await expect(service.logout('u1', 'jti-123', exp)).resolves.toEqual({ mensagem: 'Logout realizado com sucesso.' });
      expect(tokens.revogar).toHaveBeenCalledWith('jti-123', 'u1', new Date(exp * 1000));
    });
  });

  describe('excluirConta', () => {
    it('recusa exclusão com senha incorreta e não apaga nada', async () => {
      const senhaHash = await bcrypt.hash('senhaCorreta', 10);
      const fake = criarSupabaseFake([{ data: { senha_hash: senhaHash }, error: null }]);
      (service as any).supabase = fake;

      await expect(service.excluirConta('u1', 'errada')).rejects.toMatchObject({ status: 401 });
      expect(fake.rpc).not.toHaveBeenCalled();
    });

    it('apaga a conta via função transacional e remove os arquivos do Storage', async () => {
      const senhaHash = await bcrypt.hash('senhaCorreta', 10);
      const remove = jest.fn().mockResolvedValue({ error: null });
      const fake: any = criarSupabaseFake([
        { data: { senha_hash: senhaHash }, error: null },
        { data: [{ id: 'oc1' }], error: null },
        { data: [{ caminho_storage: 'u1/oc1/a.jpg' }], error: null },
      ]);
      fake.rpc = jest.fn().mockResolvedValue({ data: null, error: null });
      fake.storage = { from: () => ({ remove }) };
      (service as any).supabase = fake;

      await expect(service.excluirConta('u1', 'senhaCorreta')).resolves.toEqual({ mensagem: 'Conta apagada permanentemente.' });
      expect(fake.rpc).toHaveBeenCalledWith('apagar_conta_usuaria', { p_usuaria_id: 'u1' });
      expect(remove).toHaveBeenCalledWith(['u1/oc1/a.jpg']);
    });

    it('não remove arquivos do Storage se a exclusão no banco falhar', async () => {
      const senhaHash = await bcrypt.hash('senhaCorreta', 10);
      const remove = jest.fn();
      const fake: any = criarSupabaseFake([
        { data: { senha_hash: senhaHash }, error: null },
        { data: [{ id: 'oc1' }], error: null },
        { data: [{ caminho_storage: 'u1/oc1/a.jpg' }], error: null },
      ]);
      fake.rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'falha', code: 'XX000' } });
      fake.storage = { from: () => ({ remove }) };
      (service as any).supabase = fake;

      await expect(service.excluirConta('u1', 'senhaCorreta')).rejects.toBeDefined();
      expect(remove).not.toHaveBeenCalled();
    });
  });
});
