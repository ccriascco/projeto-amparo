/** Iniciais para o avatar (o design usa foto; o app usa as iniciais do nome) */
export function iniciais(nome: string | undefined): string {
  return (nome ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}
