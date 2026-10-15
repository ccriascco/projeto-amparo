import { ErroApi, MENSAGEM_SEM_REDE, MENSAGEM_TEMPO, mensagemDoCorpo } from './erros';

// Cliente HTTP único do app. As telas nunca chamam fetch: usam os módulos de src/api
// (através dos hooks), que passam por aqui. Aqui ficam o token, o timeout, o cancelamento,
// a renovação da sessão quando o token de acesso vence e a tradução dos erros.

export const TEMPO_PADRAO_MS = 15_000;
export const TEMPO_UPLOAD_MS = 60_000;

type Autenticacao = {
  /** Token de acesso atual (em memória) */
  obterToken: () => string | null;
  /** Renova o token de acesso com a sessão do aparelho; devolve o novo token ou null */
  renovar: () => Promise<string | null>;
  /** Chamada quando não há como continuar autenticada (sessão encerrada) */
  aoExpirar: () => void;
};

let autenticacao: Autenticacao = {
  obterToken: () => null,
  renovar: async () => null,
  aoExpirar: () => undefined,
};

export function configurarAutenticacao(a: Autenticacao) {
  autenticacao = a;
}

export function urlBase(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) throw new ErroApi('rede', 0, 'O endereço do servidor não foi configurado (EXPO_PUBLIC_API_URL).');
  return url.replace(/\/+$/, '');
}

type Opcoes = {
  corpo?: unknown;
  formulario?: FormData;
  publica?: boolean;
  tempoMs?: number;
  sinal?: AbortSignal;
};

export type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Uma renovação por vez: várias requisições com 401 ao mesmo tempo esperam a mesma renovação
let renovacaoEmAndamento: Promise<string | null> | null = null;
function renovarUmaVez(): Promise<string | null> {
  renovacaoEmAndamento ??= autenticacao.renovar().finally(() => {
    renovacaoEmAndamento = null;
  });
  return renovacaoEmAndamento;
}

export async function requisicao<T>(metodo: Metodo, caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const primeira = await enviar(metodo, caminho, opcoes, opcoes.publica ? null : autenticacao.obterToken());
  if (primeira.status === 401 && !opcoes.publica) {
    const novoToken = await renovarUmaVez();
    if (!novoToken) {
      autenticacao.aoExpirar();
      return interpretar<T>(primeira);
    }
    return interpretar<T>(await enviar(metodo, caminho, opcoes, novoToken));
  }
  return interpretar<T>(primeira);
}

async function enviar(metodo: Metodo, caminho: string, opcoes: Opcoes, token: string | null): Promise<Response> {
  const controle = new AbortController();
  let estourou = false;
  const timer = setTimeout(() => {
    estourou = true;
    controle.abort();
  }, opcoes.tempoMs ?? (opcoes.formulario ? TEMPO_UPLOAD_MS : TEMPO_PADRAO_MS));
  const aoCancelar = () => controle.abort();
  opcoes.sinal?.addEventListener('abort', aoCancelar);

  const cabecalhos: Record<string, string> = { Accept: 'application/json' };
  if (token) cabecalhos.Authorization = `Bearer ${token}`;
  let corpo: BodyInit | undefined;
  if (opcoes.formulario) {
    corpo = opcoes.formulario;
  } else if (opcoes.corpo !== undefined) {
    cabecalhos['Content-Type'] = 'application/json';
    corpo = JSON.stringify(opcoes.corpo);
  }

  try {
    return await fetch(`${urlBase()}${caminho}`, { method: metodo, headers: cabecalhos, body: corpo, signal: controle.signal });
  } catch (erro) {
    if (erro instanceof ErroApi) throw erro;
    if (opcoes.sinal?.aborted) throw new ErroApi('cancelado', 0, 'Operação cancelada.');
    if (estourou) throw new ErroApi('tempo', 0, MENSAGEM_TEMPO);
    throw new ErroApi('rede', 0, MENSAGEM_SEM_REDE);
  } finally {
    clearTimeout(timer);
    opcoes.sinal?.removeEventListener('abort', aoCancelar);
  }
}

async function interpretar<T>(resposta: Response): Promise<T> {
  const texto = await resposta.text();
  let corpo: unknown = null;
  if (texto) {
    try {
      corpo = JSON.parse(texto);
    } catch {
      corpo = null;
    }
  }
  if (!resposta.ok) {
    throw new ErroApi('http', resposta.status, mensagemDoCorpo(resposta.status, corpo), (corpo ?? {}) as Record<string, unknown>);
  }
  return corpo as T;
}
