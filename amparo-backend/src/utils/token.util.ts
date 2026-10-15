import { createHash, randomBytes } from 'crypto';

/** Token aleatório de 256 bits, seguro para ir em URL. */
export function gerarToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Só o hash do token vai para o banco: quem lê o banco não consegue usar o token. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
