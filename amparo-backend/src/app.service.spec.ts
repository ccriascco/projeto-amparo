import { AppService } from './app.service';

const selectMock = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: (...args: unknown[]) => selectMock(...args),
    }),
  }),
}));

describe('AppService.testarConexao', () => {
  it('devolve somente a contagem, nunca linhas de usuárias (dados sensíveis)', async () => {
    selectMock.mockResolvedValue({ count: 38, data: null, error: null });

    const resultado: any = await new AppService().testarConexao();

    expect(resultado.total_usuarias).toBe(38);
    expect(resultado).not.toHaveProperty('usuarias_cadastradas');
  });

  it('não expõe o detalhe do erro do banco', async () => {
    selectMock.mockResolvedValue({ count: null, data: null, error: { message: 'permission denied for table usuarias' } });

    const resultado = await new AppService().testarConexao();

    expect(JSON.stringify(resultado)).not.toContain('permission denied');
  });
});
