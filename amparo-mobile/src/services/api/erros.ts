// Erro padronizado da camada de API. As telas mostram sempre `mensagem`,
// que já está em português e nunca traz detalhes técnicos.
export type TipoErro = 'rede' | 'tempo' | 'cancelado' | 'http';

export class ErroApi extends Error {
  constructor(
    readonly tipo: TipoErro,
    readonly status: number,
    readonly mensagem: string,
    readonly dados: Record<string, unknown> = {},
  ) {
    super(mensagem);
    this.name = 'ErroApi';
  }

  get naoAutorizado() {
    return this.status === 401;
  }
}

const PADRAO_POR_STATUS: Record<number, string> = {
  400: 'Confira os dados informados.',
  401: 'Sua sessão expirou. Entre de novo.',
  403: 'Você não tem permissão para fazer isso.',
  404: 'Não encontramos o que você procurou.',
  409: 'Esses dados já estão cadastrados.',
  413: 'O arquivo é grande demais.',
  429: 'Muitas tentativas seguidas. Espere um minuto e tente de novo.',
};

export const MENSAGEM_SEM_REDE = 'Sem conexão com o servidor. Confira sua internet e tente de novo.';
export const MENSAGEM_TEMPO = 'O servidor demorou para responder. Tente de novo.';
export const MENSAGEM_INDISPONIVEL = 'O serviço está indisponível agora. Tente de novo em instantes.';

/** Traduz o corpo de erro do backend ({ erro } ou o formato do ValidationPipe) numa mensagem amigável. */
export function mensagemDoCorpo(status: number, corpo: unknown): string {
  const c = (corpo ?? {}) as { erro?: unknown; message?: unknown };
  if (status === 429) return PADRAO_POR_STATUS[429];
  if (status >= 500) return typeof c.erro === 'string' && status === 503 ? c.erro : MENSAGEM_INDISPONIVEL;
  if (typeof c.erro === 'string' && c.erro.trim()) return c.erro;
  if (Array.isArray(c.message) && c.message.length > 0) return traduzirValidacao(String(c.message[0]));
  if (typeof c.message === 'string' && c.message.trim() && status !== 400) return c.message;
  return PADRAO_POR_STATUS[status] ?? 'Algo deu errado. Tente de novo.';
}

// Mensagens do class-validator que chegam em inglês viram texto simples
function traduzirValidacao(mensagem: string): string {
  if (/should not exist/.test(mensagem)) return 'Há um campo que não pode ser enviado.';
  if (/must be an email/.test(mensagem)) return 'Esse e-mail não parece válido. Confira e tente de novo.';
  if (/must be longer than or equal to (\d+)/.test(mensagem)) return 'Algum campo está curto demais.';
  if (/must be shorter than or equal to (\d+)/.test(mensagem)) return 'Algum campo está longo demais.';
  if (/ISO 8601|date string/.test(mensagem)) return 'Confira a data informada.';
  if (/^[A-ZÀ-Ú]/.test(mensagem) || /[áéíóúãõç]/.test(mensagem)) return mensagem;
  return 'Confira os dados informados.';
}
