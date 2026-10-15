import * as SecureStore from 'expo-secure-store';

import { requisicao } from '@/api/cliente';
import { useSessao } from '@/store/sessao';

jest.mock('expo-secure-store', () => {
  const dados = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => dados.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void dados.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void dados.delete(k)),
    __dados: dados,
  };
});

jest.mock('expo-crypto', () => {
  const { createHash, randomUUID } = jest.requireActual('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: async (_alg: string, texto: string) => createHash('sha256').update(texto).digest('hex'),
    randomUUID: () => randomUUID(),
  };
});

const guardado = (SecureStore as unknown as { __dados: Map<string, string> }).__dados;
const conta = (modo_disfarcado: boolean) => ({ id: 'u1', nome_completo: 'Ana Teste', email: 'ana@x.com', modo_disfarcado });
const sessaoResposta = (modo = false) => ({ mensagem: 'ok', access_token: 'acesso', refresh_token: 'r'.repeat(43), usuaria: conta(modo) });

function resposta(status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), { status });
}

describe('sessão', () => {
  let fetchMock: jest.Mock;
  beforeEach(() => {
    guardado.clear();
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    useSessao.setState({ estado: 'iniciando', token: null, usuaria: null });
  });

  it('sem sessão guardada, começa deslogada', async () => {
    await useSessao.getState().iniciar();
    expect(useSessao.getState().estado).toBe('deslogada');
  });

  it('entrar guarda a sessão do aparelho no SecureStore e o token só em memória', async () => {
    await useSessao.getState().entrar(sessaoResposta());
    expect(useSessao.getState()).toMatchObject({ estado: 'ativa', token: 'acesso' });
    expect(guardado.get('amparo.sessao')).toBe('r'.repeat(43));
    expect([...guardado.values()].join()).not.toContain('acesso');
  });

  it('com disfarce desligado, reabre o app renovando a sessão sozinha', async () => {
    await useSessao.getState().entrar(sessaoResposta());
    useSessao.setState({ estado: 'iniciando', token: null });
    fetchMock.mockResolvedValue(resposta(201, { ...sessaoResposta(), access_token: 'novo', refresh_token: 'n'.repeat(43) }));
    await useSessao.getState().iniciar();
    expect(useSessao.getState()).toMatchObject({ estado: 'ativa', token: 'novo' });
    expect(guardado.get('amparo.sessao')).toBe('n'.repeat(43));
  });

  it('com disfarce ligado, reabre travado e só o código destrava', async () => {
    await useSessao.getState().entrar(sessaoResposta(true));
    useSessao.setState({ estado: 'iniciando', token: null });
    await useSessao.getState().iniciar();
    expect(useSessao.getState().estado).toBe('bloqueada');
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValue(resposta(201, sessaoResposta(true)));
    await useSessao.getState().desbloquear('1207');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ refresh_token: 'r'.repeat(43), codigo: '1207' });
    expect(useSessao.getState().estado).toBe('ativa');
  });

  it('código errado mantém travado; sessão encerrada pelo servidor manda para o login', async () => {
    await useSessao.getState().entrar(sessaoResposta(true));
    useSessao.getState().bloquear();
    fetchMock.mockResolvedValueOnce(resposta(401, { erro: 'Código incorreto.', tentativas_restantes: 4 }));
    await expect(useSessao.getState().desbloquear('0000')).rejects.toMatchObject({ dados: { tentativas_restantes: 4 } });
    expect(useSessao.getState().estado).toBe('bloqueada');

    fetchMock.mockResolvedValueOnce(resposta(401, { erro: 'Código errado muitas vezes.', sessao_encerrada: true }));
    await expect(useSessao.getState().desbloquear('0000')).rejects.toBeDefined();
    expect(useSessao.getState().estado).toBe('deslogada');
    expect(guardado.size).toBe(0);
  });

  it('token vencido durante o uso é renovado sem a usuária perceber', async () => {
    await useSessao.getState().entrar(sessaoResposta());
    fetchMock
      .mockResolvedValueOnce(resposta(401, { message: 'expirado' }))
      .mockResolvedValueOnce(resposta(201, { ...sessaoResposta(), access_token: 'renovado' }))
      .mockResolvedValueOnce(resposta(200, { guardioes: [] }));
    await expect(requisicao('GET', '/guardioes')).resolves.toEqual({ guardioes: [] });
    expect(useSessao.getState().token).toBe('renovado');
  });

  it('sair avisa o servidor e apaga tudo do aparelho', async () => {
    await useSessao.getState().entrar(sessaoResposta());
    fetchMock.mockResolvedValue(resposta(201, { mensagem: 'ok' }));
    await useSessao.getState().sair();
    expect(fetchMock.mock.calls[0][0]).toContain('/usuarias/logout');
    expect(useSessao.getState().estado).toBe('deslogada');
    expect(guardado.size).toBe(0);
  });

  it('5 códigos errados com o disfarce ligado: continua calculadora e o código certo leva ao login', async () => {
    await useSessao.getState().entrar(sessaoResposta(true), '1207');
    useSessao.getState().bloquear();
    fetchMock.mockResolvedValue(resposta(401, { erro: 'Código errado muitas vezes.', sessao_encerrada: true }));
    await expect(useSessao.getState().desbloquear('0000')).rejects.toBeDefined();
    expect(useSessao.getState()).toMatchObject({ estado: 'bloqueada', semSessao: true, usuaria: null });
    expect(guardado.has('amparo.sessao')).toBe(false);

    // reabrindo o app, segue calculadora
    useSessao.setState({ estado: 'iniciando', semSessao: false });
    await useSessao.getState().iniciar();
    expect(useSessao.getState()).toMatchObject({ estado: 'bloqueada', semSessao: true });

    // código errado: nada muda; código certo: tela de login (sem chamar o servidor)
    fetchMock.mockClear();
    await expect(useSessao.getState().desbloquear('9999')).rejects.toBeDefined();
    expect(useSessao.getState().estado).toBe('bloqueada');
    await useSessao.getState().desbloquear('1207');
    expect(useSessao.getState().estado).toBe('deslogada');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(guardado.size).toBe(0);
  });

  it('o hash local nunca guarda o código em texto puro', async () => {
    await useSessao.getState().entrar(sessaoResposta(true), '1207');
    expect([...guardado.values()].join()).not.toContain('1207');
  });
});
