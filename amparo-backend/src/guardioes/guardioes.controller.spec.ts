import { Test, TestingModule } from '@nestjs/testing';
import { GuardioesController } from './guardioes.controller';

describe('GuardioesController', () => {
  let controller: GuardioesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuardioesController],
    }).compile();

    controller = module.get<GuardioesController>(GuardioesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
