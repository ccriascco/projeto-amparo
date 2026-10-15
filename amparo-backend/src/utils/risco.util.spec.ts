import { montarEntradaRisco } from './risco.util';

const agora = new Date('2026-10-05T12:00:00Z');
const dias = (n: number) => new Date(agora.getTime() - n * 86_400_000).toISOString();

describe('montarEntradaRisco (janela de 30 dias)', () => {
  it('conta só as ocorrências dos últimos 30 dias', () => {
    const e = montarEntradaRisco(
      [
        { tipos_violencia: ['Física'], criado_em: dias(200) },
        { tipos_violencia: ['Moral'], criado_em: dias(3) },
      ],
      [],
      '1990-01-01',
      agora,
    );
    expect(e).toMatchObject({
      qtd_ocorrencias_totais: 1, dias_desde_ultima_ocorrencia: 3, frequencia_aumentou: 0,
      teve_viol_fisica: 0, teve_viol_moral: 1, possui_historico_anterior: 1,
    });
  });

  it('usa a data em que a violência aconteceu, quando informada', () => {
    const e = montarEntradaRisco([{ tipos_violencia: ['Física'], data_ocorrencia: dias(40).slice(0, 10), criado_em: dias(0) }], [], null, agora);
    expect(e).toMatchObject({ qtd_ocorrencias_totais: 0, teve_viol_fisica: 0, possui_historico_anterior: 1 });
  });

  it('o 30º dia ainda está dentro da janela e o 31º não', () => {
    const dentro = montarEntradaRisco([{ tipos_violencia: ['Física'], criado_em: dias(30) }], [], null, agora);
    const fora = montarEntradaRisco([{ tipos_violencia: ['Física'], criado_em: dias(31) }], [], null, agora);
    expect([dentro.teve_viol_fisica, fora.teve_viol_fisica]).toEqual([1, 0]);
  });

  it('conta só acionamentos válidos (mais de 30 s ou ativos) dos últimos 30 dias', () => {
    const e = montarEntradaRisco([], [
      { criado_em: dias(1) },
      { criado_em: dias(2), encerrado_em: new Date(new Date(dias(2)).getTime() + 10_000).toISOString() },
      { criado_em: dias(60), encerrado_em: new Date(new Date(dias(60)).getTime() + 600_000).toISOString() },
    ], null, agora);
    expect(e).toMatchObject({ qtd_panico_acionado: 1, possui_historico_anterior: 1 });
  });

  it('sem histórico nenhum, informa que não há histórico anterior', () => {
    expect(montarEntradaRisco([], [], null, agora)).toMatchObject({ qtd_ocorrencias_totais: 0, qtd_panico_acionado: 0, possui_historico_anterior: 0 });
  });
});
