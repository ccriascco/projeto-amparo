import { CALC_INICIAL, digitar, type EstadoCalc, igual, inverter, operar, porcento, virgula } from '@/components/dominio/logicaCalculadora';

const teclar = (seq: string, inicio: EstadoCalc = CALC_INICIAL) => {
  let c = inicio;
  let candidato: string | null = null;
  for (const t of seq.split(' ')) {
    if (/^\d$/.test(t)) c = digitar(c, t);
    else if (t === ',') c = virgula(c);
    else if (t === '=') ({ estado: c, codigoCandidato: candidato } = igual(c));
    else if (t === '%') c = porcento(c);
    else if (t === '±') c = inverter(c);
    else c = operar(c, t as '÷' | '×' | '−' | '+');
  }
  return { c, candidato };
};

describe('calculadora do disfarce', () => {
  it.each([
    ['1 2 + 3 0 =', '42'],
    ['7 ÷ 2 =', '3,5'],
    ['1 , 5 × 4 =', '6'],
    ['2 + 3 + 4 =', '9'],
    ['5 0 %', '0,5'],
    ['9 ±', '-9'],
    ['1 ÷ 0 =', 'Erro'],
  ])('%s → %s', (seq, visor) => {
    expect(teclar(seq).c.visor).toBe(visor);
  });

  it('4 números e "=" viram candidato a código', () => {
    expect(teclar('1 2 0 7 =').candidato).toBe('1207');
  });

  it('contas comuns não gastam tentativas do código', () => {
    expect(teclar('1 0 0 + 2 5 0 0 =').candidato).toBeNull();
    expect(teclar('1 2 3 =').candidato).toBeNull();
    expect(teclar('1 2 3 4 5 =').candidato).toBeNull();
    expect(teclar('1 2 , 3 4 =').candidato).toBeNull();
  });
});
