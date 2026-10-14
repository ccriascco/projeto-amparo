// Validações do app, iguais às do backend (amparo-backend/src/common/validadores.ts e DTOs).
// O backend sempre confere de novo; aqui elas servem para avisar antes de enviar.

export const somenteDigitos = (v: string) => v.replace(/\D/g, '');

export function cpfValido(cpf: string): boolean {
  const d = somenteDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (base: string, peso: number) => {
    const soma = [...base].reduce((acc, n, i) => acc + Number(n) * (peso - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(d.slice(0, 9), 10) === Number(d[9]) && digito(d.slice(0, 10), 11) === Number(d[10]);
}

export function mascararCpf(v: string): string {
  const d = somenteDigitos(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

export function mascararTelefone(v: string): string {
  const d = somenteDigitos(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Celular ou fixo brasileiro com DDD (10 ou 11 dígitos) */
export const telefoneValido = (v: string) => /^\d{10,11}$/.test(somenteDigitos(v));

export function mascararData(v: string): string {
  const d = somenteDigitos(v).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** DD/MM/AAAA → AAAA-MM-DD, ou null se a data não existir */
export function dataParaIso(v: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return null;
  const [, dia, mes, ano] = m;
  const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  if (data.getUTCDate() !== Number(dia) || data.getUTCMonth() !== Number(mes) - 1) return null;
  return `${ano}-${mes}-${dia}`;
}

export function isoParaData(iso: string | null | undefined): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export function dataNoFuturo(iso: string): boolean {
  return iso > new Date().toISOString().slice(0, 10);
}

export const emailValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

// Regras da senha de login (checklist do design + regras do backend)
export const REGRAS_SENHA = [
  { id: 'tamanho', texto: 'Sua senha precisa ter no mínimo 8 caracteres.', ok: (s: string) => s.length >= 8 },
  { id: 'maiuscula', texto: 'Adicione pelo menos 1 letra maiúscula.', ok: (s: string) => /[A-ZÀ-Ý]/.test(s) },
  { id: 'numero', texto: 'Adicione pelo menos 1 número.', ok: (s: string) => /\d/.test(s) },
  { id: 'especial', texto: 'Adicione pelo menos 1 caractere especial', ok: (s: string) => /[^A-Za-zÀ-ÿ0-9]/.test(s) },
] as const;

export const senhaAtendeRegras = (s: string) => s.length <= 72 && REGRAS_SENHA.every((r) => r.ok(s));

export const codigoValido = (v: string) => /^\d{4}$/.test(v);
