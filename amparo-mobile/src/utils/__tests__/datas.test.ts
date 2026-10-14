import { diaDaOcorrencia, diaMesDeData, diasDesde, periodoDe, semanaAtual } from '@/utils/datas';

describe('datas', () => {
  const quartaFeira = new Date(2026, 9, 14, 10, 0); // 14/10/2026

  it('semana atual vai de segunda a domingo', () => {
    const s = semanaAtual(quartaFeira);
    expect(s[0]).toEqual({ dia: '2026-10-12', letra: 'S' });
    expect(s[6]).toEqual({ dia: '2026-10-18', letra: 'D' });
  });

  it('domingo pertence à semana que começou na segunda anterior', () => {
    expect(semanaAtual(new Date(2026, 9, 18))[0].dia).toBe('2026-10-12');
  });

  it('período para o filtro da lista', () => {
    expect(periodoDe('2026-10-13', quartaFeira)).toBe('Esta semana');
    expect(periodoDe('2026-10-02', quartaFeira)).toBe('Este mês');
    expect(periodoDe('2026-09-30', quartaFeira)).toBe('Mais antigas');
  });

  it('dia da ocorrência usa a data informada antes da data do registro', () => {
    expect(diaDaOcorrencia({ data_ocorrencia: '2026-10-01', criado_em: '2026-10-14T12:00:00Z' })).toBe('2026-10-01');
    expect(diaMesDeData('2026-10-01')).toBe('01/10');
  });

  it('dias desde', () => {
    expect(diasDesde('2026-10-02', quartaFeira)).toBe(12);
    expect(diasDesde('2026-10-14', quartaFeira)).toBe(0);
  });
});
