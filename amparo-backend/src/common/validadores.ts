import { ValidateBy, buildMessage } from 'class-validator';

const SENHAS_COMUNS = new Set([
  'senha123', 'senha1234', 'senha12345', 'password1', 'password123',
  'qwerty123', 'abc12345', 'admin123', 'mudar123', 'amparo123',
]);

function ehSequencia(texto: string): boolean {
  const s = texto.toLowerCase();
  if (s.length < 3) return false;
  const passos = [...s].slice(1).map((c, i) => c.charCodeAt(0) - s.charCodeAt(i));
  return passos.every((p) => p === 1) || passos.every((p) => p === -1);
}

/** Motivo pelo qual a senha é fraca, ou null se ela for aceitável. */
export function motivoSenhaFraca(senha: unknown): string | null {
  if (typeof senha !== 'string') return 'a senha precisa ser um texto';
  if (!/[A-Za-zÀ-ÿ]/.test(senha) || !/\d/.test(senha)) return 'a senha precisa ter letras e números';
  if (ehSequencia(senha)) return 'a senha não pode ser uma sequência';
  if (SENHAS_COMUNS.has(senha.toLowerCase())) return 'a senha é muito comum';
  return null;
}

export function SenhaForte() {
  return ValidateBy({
    name: 'senhaForte',
    validator: {
      validate: (valor) => motivoSenhaFraca(valor) === null,
      defaultMessage: buildMessage((_prefixo, args) => `Senha fraca: ${motivoSenhaFraca(args?.value)}.`),
    },
  });
}

export function NaoPodeSerFutura() {
  return ValidateBy({
    name: 'naoPodeSerFutura',
    validator: {
      validate: (valor) => typeof valor === 'string' && !Number.isNaN(Date.parse(valor)) && new Date(valor) <= new Date(),
      defaultMessage: buildMessage((_prefixo, args) => `${args?.property} não pode ser uma data futura`),
    },
  });
}

export function normalizarTelefone(telefone: unknown): string {
  return String(telefone ?? '').replace(/\D/g, '');
}

/** Para listas de guardiãs: o mesmo telefone não pode aparecer duas vezes. */
export function TelefonesSemRepeticao() {
  return ValidateBy({
    name: 'telefonesSemRepeticao',
    validator: {
      validate: (valor) => {
        if (!Array.isArray(valor)) return true;
        const telefones = valor.map((g) => normalizarTelefone(g?.telefone));
        return new Set(telefones).size === telefones.length;
      },
      defaultMessage: buildMessage(() => 'a mesma guardiã (telefone) foi informada mais de uma vez'),
    },
  });
}
