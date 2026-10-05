import { Test, TestingModule } from '@nestjs/testing';
import { UsuariasController } from './usuarias.controller';
import { UsuariasService } from './usuarias.service';

describe('UsuariasController', () => {
  let controller: UsuariasController;
  let service: { cadastrar: jest.Mock; login: jest.Mock; loginDisfarcado: jest.Mock };

  beforeEach(async () => {
    service = {
      cadastrar: jest.fn(),
      login: jest.fn(),
      loginDisfarcado: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariasController],
      providers: [{ provide: UsuariasService, useValue: service }],
    }).compile();

    controller = module.get<UsuariasController>(UsuariasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('cadastrar delega pro service', async () => {
    service.cadastrar.mockResolvedValue({ mensagem: 'ok' });
    const body: any = { email: 'a@a.com' };

    await expect(controller.cadastrar(body)).resolves.toEqual({ mensagem: 'ok' });
    expect(service.cadastrar).toHaveBeenCalledWith(body);
  });

  it('login-disfarcado delega pro método correto do service (P14)', async () => {
    service.loginDisfarcado.mockResolvedValue({ mensagem: 'ok disfarcado' });
    const body: any = { email: 'a@a.com', senha: 'calc1234' };

    await expect(controller.loginDisfarcado(body)).resolves.toEqual({ mensagem: 'ok disfarcado' });
    expect(service.loginDisfarcado).toHaveBeenCalledWith(body);
    expect(service.login).not.toHaveBeenCalled();
  });
});
