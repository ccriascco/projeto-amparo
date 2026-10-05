import { Test, TestingModule } from '@nestjs/testing';
import { GuardioesController } from './guardioes.controller';
import { GuardioesService } from './guardioes.service';

describe('GuardioesController', () => {
  let controller: GuardioesController;
  let service: { cadastrar: jest.Mock; listarPorUsuaria: jest.Mock; atualizar: jest.Mock; remover: jest.Mock };

  beforeEach(async () => {
    service = {
      cadastrar: jest.fn(),
      listarPorUsuaria: jest.fn(),
      atualizar: jest.fn(),
      remover: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuardioesController],
      providers: [{ provide: GuardioesService, useValue: service }],
    }).compile();

    controller = module.get<GuardioesController>(GuardioesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('cadastrar ignora qualquer usuaria_id vindo do body e usa o do JWT (anti-falsidade)', async () => {
    service.cadastrar.mockResolvedValue({ mensagem: 'ok' });
    const body: any = { usuaria_id: 'id-falso-injetado', nome_completo: 'G', telefone: '111' };
    const user = { id: 'id-real-do-token' };

    await controller.cadastrar(body, user);

    expect(service.cadastrar).toHaveBeenCalledWith(
      expect.objectContaining({ usuaria_id: 'id-real-do-token' }),
    );
  });
});
