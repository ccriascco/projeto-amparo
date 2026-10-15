// Calculadora funcional do Modo Disfarce (mesma lógica do protótipo).
// Os últimos dígitos digitados ficam em `codigo`; ao tocar "=", se os 4 últimos
// formarem um código, a tela pergunta ao servidor se ele destrava o app.

export type Operacao = '÷' | '×' | '−' | '+';

export type EstadoCalc = {
  visor: string;
  anterior: number | null;
  op: Operacao | null;
  novo: boolean;
  codigo: string;
};

export const CALC_INICIAL: EstadoCalc = { visor: '0', anterior: null, op: null, novo: true, codigo: '' };

const OPS: Record<Operacao, (a: number, b: number) => number> = {
  '÷': (a, b) => a / b,
  '×': (a, b) => a * b,
  '−': (a, b) => a - b,
  '+': (a, b) => a + b,
};

const numero = (v: string) => parseFloat(v.replace(',', '.'));

export function formatar(n: number): string {
  if (!Number.isFinite(n)) return 'Erro';
  const r = Math.round(n * 1e9) / 1e9;
  return String(r).replace('.', ',');
}

export function digitar(c: EstadoCalc, d: string): EstadoCalc {
  const visor = c.novo || c.visor === '0' ? d : c.visor.length < 9 ? c.visor + d : c.visor;
  return { ...c, visor, novo: false, codigo: (c.codigo + d).slice(-8) };
}

export function virgula(c: EstadoCalc): EstadoCalc {
  if (c.novo) return { ...c, visor: '0,', novo: false };
  return c.visor.includes(',') ? c : { ...c, visor: c.visor + ',' };
}

export function operar(c: EstadoCalc, op: Operacao): EstadoCalc {
  // Encadeia contas (2 + 3 + → mostra 5), como a calculadora do celular
  const base = c.op !== null && c.anterior !== null && !c.novo ? OPS[c.op](c.anterior, numero(c.visor)) : numero(c.visor);
  return { ...c, visor: formatar(base), anterior: base, op, novo: true, codigo: '' };
}

/**
 * Resultado do "=": a conta feita e, se houver, o código candidato a destravar.
 * Só vira candidato quando a pessoa digitou exatamente 4 números e "=" (sem conta pendente).
 * Assim, contas comuns (ex.: 100 + 2500 =) não gastam as 5 tentativas do código.
 */
export function igual(c: EstadoCalc): { estado: EstadoCalc; codigoCandidato: string | null } {
  const candidato = c.op === null && /^\d{4}$/.test(c.visor) && c.codigo.endsWith(c.visor) ? c.visor : null;
  if (c.op === null || c.anterior === null) {
    return { estado: { ...c, novo: true, codigo: '' }, codigoCandidato: candidato };
  }
  const r = OPS[c.op](c.anterior, numero(c.visor));
  return { estado: { visor: formatar(r), anterior: null, op: null, novo: true, codigo: '' }, codigoCandidato: candidato };
}

export const limpar = (): EstadoCalc => CALC_INICIAL;
export const inverter = (c: EstadoCalc): EstadoCalc => ({ ...c, visor: formatar(-numero(c.visor)) });
export const porcento = (c: EstadoCalc): EstadoCalc => ({ ...c, visor: formatar(numero(c.visor) / 100) });
