import { ValidateBy, buildMessage } from 'class-validator';

const SENHAS_COMUNS = new Set([
  'senha123', 'senha1234', 'senha12345', 'password1', 'password123',
  'qwerty123', 'abc12345', 'admin123', 'mudar123', 'amparo123',
  'senha@123', 'senha123!', 'senha@1234', 'password@1', 'password1!', 'p@ssw0rd',
  'p@ssw0rd1', 'admin@123', 'mudar@123', 'amparo@123', 'qwerty@123', 'abc@1234',
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
  if (senha.length < 8) return 'a senha precisa ter no mínimo 8 caracteres';
  if (!/[A-ZÀ-Ý]/.test(senha)) return 'a senha precisa ter pelo menos 1 letra maiúscula';
  if (!/\d/.test(senha)) return 'a senha precisa ter pelo menos 1 número';
  if (!/[^A-Za-zÀ-ÿ0-9]/.test(senha)) return 'a senha precisa ter pelo menos 1 caractere especial';
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

/** Código do Modo Disfarce: exatamente 4 números. */
export const REGEX_CODIGO_DISFARCE = /^\d{4}$/;

export function CodigoDisfarce() {
  return ValidateBy({
    name: 'codigoDisfarce',
    validator: {
      validate: (valor) => typeof valor === 'string' && REGEX_CODIGO_DISFARCE.test(valor),
      defaultMessage: buildMessage(() => 'O código do Modo Disfarce precisa ter exatamente 4 números.'),
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
