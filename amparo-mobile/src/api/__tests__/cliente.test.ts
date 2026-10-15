import { configurarAutenticacao, requisicao } from '@/api/cliente';
import { ErroApi, mensagemDoCorpo, MENSAGEM_SEM_REDE, MENSAGEM_TEMPO } from '@/api/erros';

function resposta(status: number, corpo?: unknown) {
  return new Response(corpo === undefined ? '' : JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('cliente HTTP', () => {
  let fetchMock: jest.Mock;
  let token: string | null;
  let renovar: jest.Mock;
  let aoExpirar: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    token = 'token-1';
    renovar = jest.fn();
    aoExpirar = jest.fn();
    configurarAutenticacao({ obterToken: () => token, renovar, aoExpirar });
  });

  it('envia o token, JSON e devolve o corpo', async () => {
    fetchMock.mockResolvedValue(resposta(200, { ok: true }));
    await expect(requisicao('POST', '/ocorrencias', { corpo: { a: 1 } })).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.teste.invalid/ocorrencias');
    expect(init.headers.Authorization).toBe('Bearer token-1');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"a":1}');
  });

  it('rota pública não envia token', async () => {
    fetchMock.mockResolvedValue(resposta(201, {}));
    await requisicao('POST', '/usuarias/login', { corpo: {}, publica: true });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('com 401, renova a sessão uma vez e repete a requisição com o token novo', async () => {
    fetchMock.mockResolvedValueOnce(resposta(401, { message: 'expirado' })).mockResolvedValueOnce(resposta(200, { ok: 2 }));
    renovar.mockResolvedValue('token-2');
    await expect(requisicao('GET', '/guardioes')).resolves.toEqual({ ok: 2 });
    expect(renovar).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer token-2');
  });

  it('várias requisições com 401 ao mesmo tempo esperam uma única renovação', async () => {
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) =>
      (init.headers as Record<string, string>).Authorization === 'Bearer token-2' ? resposta(200, {}) : resposta(401, {}),
    );
    renovar.mockImplementation(() => new Promise((r) => setTimeout(() => r('token-2'), 10)));
    await Promise.all([requisicao('GET', '/a'), requisicao('GET', '/b'), requisicao('GET', '/c')]);
    expect(renovar).toHaveBeenCalledTimes(1);
  });

  it('se a renovação falhar, avisa que a sessão acabou e devolve o erro 401', async () => {
    fetchMock.mockResolvedValue(resposta(401, { erro: 'Sessão encerrada. Faça login novamente.' }));
    renovar.mockResolvedValue(null);
    await expect(requisicao('GET', '/guardioes')).rejects.toMatchObject({ status: 401, mensagem: 'Sessão encerrada. Faça login novamente.' });
    expect(aoExpirar).toHaveBeenCalled();
  });

  it('sem rede, devolve erro amigável em português', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await expect(requisicao('GET', '/x')).rejects.toMatchObject({ tipo: 'rede', mensagem: MENSAGEM_SEM_REDE });
  });

  it('estoura o tempo limite e cancela a requisição', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_res, rej) => init.signal?.addEventListener('abort', () => rej(new Error('aborted')))),
    );
    const p = requisicao('GET', '/lento', { tempoMs: 1000 });
    jest.advanceTimersByTime(1001);
    await expect(p).rejects.toMatchObject({ tipo: 'tempo', mensagem: MENSAGEM_TEMPO });
    jest.useRealTimers();
  });

  it('cancelamento pela tela vira tipo "cancelado"', async () => {
    const controle = new AbortController();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_res, rej) => init.signal?.addEventListener('abort', () => rej(new Error('aborted')))),
    );
    const p = requisicao('GET', '/x', { sinal: controle.signal });
    controle.abort();
    await expect(p).rejects.toMatchObject({ tipo: 'cancelado' });
  });

  it('mantém os dados extras do erro (ex.: tentativas restantes do código)', async () => {
    fetchMock.mockResolvedValue(resposta(401, { erro: 'Código incorreto.', tentativas_restantes: 3 }));
    const erro = (await requisicao('POST', '/usuarias/sessao/renovar', { publica: true }).catch((e) => e)) as ErroApi;
    expect(erro.mensagem).toBe('Código incorreto.');
    expect(erro.dados.tentativas_restantes).toBe(3);
  });
});

describe('mensagemDoCorpo', () => {
  it.each([
    [409, { erro: 'Esta guardiã (telefone) já está cadastrada.' }, 'Esta guardiã (telefone) já está cadastrada.'],
    [400, { message: ['email must be an email'] }, 'Esse e-mail não parece válido. Confira e tente de novo.'],
    [400, { message: ['Senha fraca: a senha precisa ter pelo menos 1 número.'] }, 'Senha fraca: a senha precisa ter pelo menos 1 número.'],
    [400, { message: ['property x should not exist'] }, 'Há um campo que não pode ser enviado.'],
    [429, { message: 'ThrottlerException: Too Many Requests' }, 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'],
    [500, { erro: 'detalhe interno' }, 'O serviço está indisponível agora. Tente de novo em instantes.'],
    [404, null, 'Não encontramos o que você procurou.'],
  ])('status %p', (status, corpo, esperado) => {
    expect(mensagemDoCorpo(status, corpo)).toBe(esperado);
  });
});
