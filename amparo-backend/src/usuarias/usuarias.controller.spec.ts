import { Test, TestingModule } from '@nestjs/testing';
import { UsuariasController } from './usuarias.controller';

describe('UsuariasController', () => {
  let controller: UsuariasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariasController],
    }).compile();

    controller = module.get<UsuariasController>(UsuariasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
