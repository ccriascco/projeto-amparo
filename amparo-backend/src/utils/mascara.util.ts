/** Mantém só os 4 últimos dígitos, para identificar o contato em log sem expor o número. */
export function mascararTelefone(telefone: string | null | undefined): string {
  const digitos = String(telefone ?? '').replace(/\D/g, '');
  return digitos.length <= 4 ? '****' : `${'*'.repeat(digitos.length - 4)}${digitos.slice(-4)}`;
}

/** Mantém a primeira letra e o domínio (ex.: m*****@exemplo.com), para identificar o e-mail em log. */
export function mascararEmail(email: string | null | undefined): string {
  const [usuario, dominio] = String(email ?? '').split('@');
  if (!usuario || !dominio) return '***';
  return `${usuario[0]}${'*'.repeat(Math.max(usuario.length - 1, 3))}@${dominio}`;
}
