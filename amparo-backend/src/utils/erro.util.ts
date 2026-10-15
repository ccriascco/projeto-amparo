import { HttpException, HttpStatus, Logger } from '@nestjs/common';

const logger = new Logger('ErroSupabase');

type ErroBanco = { message: string; code?: string };

/** Preserva o código do Postgres (ex.: 23505) para o tratarErro decidir o status. */
export function erroDoBanco(error: ErroBanco): Error & { code?: string } {
  const erro = new Error(error.message) as Error & { code?: string };
  erro.code = error.code;
  return erro;
}

const CODIGOS_CLIENTE = (codigo: string) => codigo.startsWith('22') || codigo.startsWith('23') || codigo === 'P0001';

function ehFalhaDeRede(error: unknown): boolean {
  const causa = (error as { cause?: { code?: string } })?.cause?.code;
  const mensagem = error instanceof Error ? error.message : '';
  return (
    mensagem.includes('fetch failed') ||
    ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN'].includes(causa ?? '')
  );
}

/**
 * Converte um erro inesperado em HttpException com mensagem segura para o
 * cliente. O detalhe real fica só no log do servidor. Status:
 *  - 409 duplicidade (23505)
 *  - 400 violação de regra/dados (classe 22/23 e regras do banco P0001)
 *  - 503 banco/rede indisponível
 *  - 500 demais falhas internas
 * HttpException lançada de propósito passa direto.
 */
export function tratarErro(error: unknown, mensagemPadrao: string): HttpException {
  if (error instanceof HttpException) {
    return error;
  }

  logger.error(mensagemPadrao, error instanceof Error ? error.stack : JSON.stringify(error));

  const codigo = (error as { code?: string })?.code;

  if (codigo === '23505') {
    return new HttpException({ erro: 'Já existe um registro com esses dados.' }, HttpStatus.CONFLICT);
  }
  if (codigo && CODIGOS_CLIENTE(codigo)) {
    return new HttpException({ erro: mensagemPadrao }, HttpStatus.BAD_REQUEST);
  }
  if (ehFalhaDeRede(error)) {
    return new HttpException(
      { erro: 'Serviço temporariamente indisponível. Tente novamente em instantes.' },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
  return new HttpException({ erro: mensagemPadrao }, HttpStatus.INTERNAL_SERVER_ERROR);
}
