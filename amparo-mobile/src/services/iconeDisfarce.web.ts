import { Asset } from 'expo-asset';

// Versão web do ícone do Modo Disfarce. O navegador não deixa um site trocar o ícone da tela
// inicial do aparelho; o que dá para trocar é a aba: ícone de calculadora e título "Calc".
const TITULO_DISFARCE = 'Calc';
const SELETOR_ICONE = 'link[rel~="icon"]';

// Como a aba estava antes do disfarce. Sem <link> de ícone, o navegador usa o /favicon.ico sozinho.
let original: { titulo: string; icone: string | null } | null = null;
let vigia: MutationObserver | null = null;

// Se algo trocar o título da aba enquanto o disfarce está ligado (ex.: navegação), volta para "Calc"
function vigiarTitulo(ligado: boolean) {
  vigia?.disconnect();
  vigia = null;
  const titulo = document.querySelector('title');
  if (!ligado || !titulo) return;
  vigia = new MutationObserver(() => {
    if (document.title !== TITULO_DISFARCE) document.title = TITULO_DISFARCE;
  });
  vigia.observe(titulo, { childList: true, characterData: true, subtree: true });
}

/** Deixa a aba do navegador de acordo com o Modo Disfarce. Desligado e nunca trocado: não mexe em nada. */
export async function aplicarIconeDisfarce(ligado: boolean): Promise<void> {
  if (typeof document === 'undefined') return;
  if (!ligado && !original) return;
  if (!original) {
    original = { titulo: document.title, icone: document.querySelector(SELETOR_ICONE)?.getAttribute('href') ?? null };
  }
  let link = document.querySelector<HTMLLinkElement>(SELETOR_ICONE);

  if (ligado) {
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = Asset.fromModule(require('@/assets/images/favicon-calc.png')).uri;
    document.title = TITULO_DISFARCE;
  } else {
    vigiarTitulo(false);
    if (original.icone === null) link?.remove();
    else if (link) link.setAttribute('href', original.icone);
    document.title = original.titulo;
    original = null;
    return;
  }
  vigiarTitulo(true);
}
