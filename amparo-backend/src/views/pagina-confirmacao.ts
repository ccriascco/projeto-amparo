/**
 * Páginas HTML simples para as guardiãs (abertas pelo link da mensagem, sem instalar nada).
 * O texto é neutro de propósito: não menciona o app nem o motivo do convite.
 */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function horaBrasil(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
}

type Opcoes = { titulo: string; paragrafos: string[]; acao?: { url: string; rotulo: string }; link?: { url: string; rotulo: string } };

export function pagina({ titulo, paragrafos, acao, link }: Opcoes): string {
  const corpo = paragrafos.map((p) => `<p>${escaparHtml(p)}</p>`).join('\n');
  const botao = acao
    ? `<form method="post" action="${escaparHtml(acao.url)}"><button type="submit">${escaparHtml(acao.rotulo)}</button></form>`
    : '';
  const ancora = link ? `<a class="secundario" href="${escaparHtml(link.url)}" rel="noopener noreferrer">${escaparHtml(link.rotulo)}</a>` : '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escaparHtml(titulo)}</title>
<style>
  body { margin: 0; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; background: #FCFBFA; color: #1A1A1A; }
  main { max-width: 440px; margin: 0 auto; padding: 48px 24px; display: flex; flex-direction: column; gap: 16px; }
  h1 { font-size: 25px; line-height: 1.2; margin: 0; }
  p { font-size: 16px; line-height: 1.5; margin: 0; color: rgba(26,26,26,0.8); }
  button, a.secundario { display: block; width: 100%; box-sizing: border-box; min-height: 48px; border-radius: 999px; font-size: 16px; font-weight: 700; text-align: center; text-decoration: none; padding: 14px 24px; cursor: pointer; }
  button { border: 0; background: #954B6E; color: #FFFFFF; }
  a.secundario { border: 1.5px solid #954B6E; color: #954B6E; }
</style>
</head>
<body><main>
<h1>${escaparHtml(titulo)}</h1>
${corpo}
${ancora}
${botao}
</main></body>
</html>`;
}
