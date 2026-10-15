import { Test, TestingModule } from '@nestjs/testing';
import { UsuariasController } from './usuarias.controller';
import { UsuariasService } from './usuarias.service';

describe('UsuariasController', () => {
  let controller: UsuariasController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      cadastrar: jest.fn(),
      login: jest.fn(),
      renovarSessao: jest.fn(),
      logout: jest.fn(),
      trocarSenha: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariasController],
      providers: [{ provide: UsuariasService, useValue: service }],
    }).compile();

    controller = module.get<UsuariasController>(UsuariasController);
  });

  it('cadastrar delega pro service', async () => {
    service.cadastrar.mockResolvedValue({ mensagem: 'ok' });
    const body: any = { email: 'a@a.com' };
    await expect(controller.cadastrar(body)).resolves.toEqual({ mensagem: 'ok' });
    expect(service.cadastrar).toHaveBeenCalledWith(body);
  });

  it('o login antigo pela senha de disfarce não existe mais', () => {
    expect((controller as any).loginDisfarcado).toBeUndefined();
  });

  it('renovar sessão repassa o refresh token e o código', async () => {
    await controller.renovarSessao({ refresh_token: 'r'.repeat(43), codigo: '1207' });
    expect(service.renovarSessao).toHaveBeenCalledWith('r'.repeat(43), '1207');
  });

  it('logout e troca de senha usam a sessão (sid) do token atual', async () => {
    const user = { id: 'u1', jti: 'j1', exp: 1, sid: 's1' };
    await controller.logout({}, user);
    expect(service.logout).toHaveBeenCalledWith('u1', 'j1', 1, 's1', undefined);
    await controller.trocarSenha({ senha_atual: 'a', nova_senha: 'b' }, user);
    expect(service.trocarSenha).toHaveBeenCalledWith('u1', 's1', 'a', 'b');
  });
});
