import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: { testarConexao: jest.Mock };

  beforeEach(async () => {
    appService = { testarConexao: jest.fn() };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: appService }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('testarBanco', () => {
    it('delega para o AppService e devolve o resultado', async () => {
      const resultado = { mensagem: 'Conexão com o Supabase realizada com sucesso! 🚀', usuarias_cadastradas: [] };
      appService.testarConexao.mockResolvedValue(resultado);

      await expect(appController.testarBanco()).resolves.toEqual(resultado);
      expect(appService.testarConexao).toHaveBeenCalled();
    });
  });
});
