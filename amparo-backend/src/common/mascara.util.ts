/** Mantém só os 4 últimos dígitos, para identificar o contato em log sem expor o número. */
export function mascararTelefone(telefone: string | null | undefined): string {
  const digitos = String(telefone ?? '').replace(/\D/g, '');
  return digitos.length <= 4 ? '****' : `${'*'.repeat(digitos.length - 4)}${digitos.slice(-4)}`;
}
