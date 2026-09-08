import { Test, TestingModule } from '@nestjs/testing';
import { UsuariasService } from './usuarias.service';

describe('UsuariasService', () => {
  let service: UsuariasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsuariasService],
    }).compile();

    service = module.get<UsuariasService>(UsuariasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
