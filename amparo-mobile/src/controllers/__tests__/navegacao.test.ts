import { router } from 'expo-router';

import { voltar } from '@/controllers/navegacao';

jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const mockRouter = router as unknown as { canGoBack: jest.Mock; back: jest.Mock; replace: jest.Mock };

describe('voltar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('volta para a tela anterior quando ela existe', () => {
    mockRouter.canGoBack.mockReturnValue(true);
    voltar();
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('vai para a tela inicial quando não há tela anterior (ex.: página recarregada no navegador)', () => {
    mockRouter.canGoBack.mockReturnValue(false);
    voltar();
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });
});
