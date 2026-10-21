import { aplicarIconeDisfarce } from '../iconeDisfarce';

const mockIcones = { suporta: true, atual: null as string | null, trocar: jest.fn(async (nome: string | null) => nome) };

jest.mock('expo-alternate-app-icons', () => ({
  get supportsAlternateIcons() {
    return mockIcones.suporta;
  },
  getAppIconName: () => mockIcones.atual,
  setAlternateAppIcon: (nome: string | null) => mockIcones.trocar(nome),
}));

describe('aplicarIconeDisfarce', () => {
  beforeEach(() => {
    mockIcones.suporta = true;
    mockIcones.atual = null;
    mockIcones.trocar.mockClear();
  });

  it('ligar troca para o ícone de calculadora; desligar volta ao padrão', async () => {
    await aplicarIconeDisfarce(true);
    expect(mockIcones.trocar).toHaveBeenLastCalledWith('Calc');
    mockIcones.atual = 'Calc';
    await aplicarIconeDisfarce(false);
    expect(mockIcones.trocar).toHaveBeenLastCalledWith(null);
  });

  it('não troca de novo quando o ícone já está certo', async () => {
    mockIcones.atual = 'Calc';
    await aplicarIconeDisfarce(true);
    mockIcones.atual = null;
    await aplicarIconeDisfarce(false);
    expect(mockIcones.trocar).not.toHaveBeenCalled();
  });

  it('sem suporte a ícones alternativos (ex.: web), não faz nada', async () => {
    mockIcones.suporta = false;
    await aplicarIconeDisfarce(true);
    expect(mockIcones.trocar).not.toHaveBeenCalled();
  });

  it('uma falha na troca não derruba o app', async () => {
    mockIcones.trocar.mockRejectedValueOnce(new Error('falhou'));
    await expect(aplicarIconeDisfarce(true)).resolves.toBeUndefined();
  });
});
