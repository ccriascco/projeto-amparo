import { create } from 'zustand';

import { configurarAutenticacao } from '@/services/api/cliente';
import { apiUsuarias } from '@/services/api/endpoints';
import { ErroApi } from '@/services/api/erros';
import type { RespostaSessao, UsuariaResumo } from '@/models/tipos';
import { apagar, gravar, ler } from '@/utils/armazenamento';
import { apagarCodigoLocal, conferirCodigoLocal, guardarCodigoLocal, temCodigoLocal } from '@/utils/codigoLocal';

// Sessão do app.
//  - O token de acesso (2 h) fica só em memória.
//  - A sessão do aparelho (refresh token) e um resumo da conta ficam no SecureStore.
//  - Com o Modo Disfarce ligado, o app abre travado na calculadora: só o código de 4 números
//    (conferido pelo backend junto com a sessão do aparelho) destrava.
//  - Se a sessão acabar com o disfarce ligado (ex.: 5 códigos errados), o app continua parecendo
//    uma calculadora; o código certo leva à tela de login (conferido pelo hash local).
export type EstadoSessao = 'iniciando' | 'deslogada' | 'bloqueada' | 'ativa';

const CHAVE_REFRESH = 'amparo.sessao';
const CHAVE_CONTA = 'amparo.conta';
const CHAVE_DISFARCE_SEM_SESSAO = 'amparo.disfarce_sem_sessao';

type Sessao = {
  estado: EstadoSessao;
  token: string | null;
  usuaria: UsuariaResumo | null;
  /** Calculadora sem sessão no servidor: o código certo só abre o login */
  semSessao: boolean;
  iniciar: () => Promise<void>;
  entrar: (resposta: RespostaSessao, codigoDisfarce?: string) => Promise<void>;
  desbloquear: (codigo: string) => Promise<void>;
  bloquear: () => void;
  travar: () => void;
  lembrarCodigo: (codigo: string) => Promise<void>;
  definirModoDisfarce: (ligado: boolean) => Promise<void>;
  atualizarNome: (nome: string) => Promise<void>;
  sair: (opcoes?: { avisarServidor?: boolean }) => Promise<void>;
};

async function lerConta(): Promise<UsuariaResumo | null> {
  const texto = await ler(CHAVE_CONTA);
  if (!texto) return null;
  try {
    return JSON.parse(texto) as UsuariaResumo;
  } catch {
    return null;
  }
}

async function apagarSessaoLocal() {
  await Promise.all([apagar(CHAVE_REFRESH), apagar(CHAVE_CONTA)]);
}

const SEM_ERRO = new ErroApi('http', 401, 'Código incorreto.');

export const useSessao = create<Sessao>()((set, get) => ({
  estado: 'iniciando',
  token: null,
  usuaria: null,
  semSessao: false,

  iniciar: async () => {
    const [refresh, conta, disfarceSemSessao] = await Promise.all([ler(CHAVE_REFRESH), lerConta(), ler(CHAVE_DISFARCE_SEM_SESSAO)]);
    if (!refresh || !conta) {
      const calculadora = disfarceSemSessao === '1' && (await temCodigoLocal());
      set({ estado: calculadora ? 'bloqueada' : 'deslogada', token: null, usuaria: null, semSessao: calculadora });
      return;
    }
    if (conta.modo_disfarcado) {
      set({ estado: 'bloqueada', token: null, usuaria: conta, semSessao: false });
      return;
    }
    set({ usuaria: conta });
    const token = await renovarSessao();
    if (useSessao.getState().estado === 'iniciando') set({ estado: token ? 'ativa' : 'deslogada' });
  },

  entrar: async (resposta, codigoDisfarce) => {
    await Promise.all([
      gravar(CHAVE_REFRESH, resposta.refresh_token),
      gravar(CHAVE_CONTA, JSON.stringify(resposta.usuaria)),
      apagar(CHAVE_DISFARCE_SEM_SESSAO),
      codigoDisfarce ? guardarCodigoLocal(codigoDisfarce) : Promise.resolve(),
    ]);
    set({ estado: 'ativa', token: resposta.access_token, usuaria: resposta.usuaria, semSessao: false });
  },

  desbloquear: async (codigo) => {
    if (get().semSessao) {
      if (!(await conferirCodigoLocal(codigo))) throw SEM_ERRO;
      await Promise.all([apagar(CHAVE_DISFARCE_SEM_SESSAO), apagarCodigoLocal()]);
      set({ estado: 'deslogada', semSessao: false });
      return;
    }
    const refresh = await ler(CHAVE_REFRESH);
    if (!refresh) throw SEM_ERRO;
    try {
      await get().entrar(await apiUsuarias.renovarSessao(refresh, codigo), codigo);
    } catch (erro) {
      if (erro instanceof ErroApi && erro.dados.sessao_encerrada) await encerrarDisfarcada();
      throw erro;
    }
  },

  // Ao sair do app com o disfarce ligado, o conteúdo some e só o código abre de novo
  bloquear: () => {
    if (get().usuaria?.modo_disfarcado && get().estado === 'ativa') set({ estado: 'bloqueada', token: null });
  },

  travar: () => {
    if (get().estado === 'ativa') set({ estado: 'bloqueada', token: null });
  },

  lembrarCodigo: (codigo) => guardarCodigoLocal(codigo),

  definirModoDisfarce: async (ligado) => {
    const usuaria = get().usuaria;
    if (!usuaria) return;
    const atualizada = { ...usuaria, modo_disfarcado: ligado };
    await gravar(CHAVE_CONTA, JSON.stringify(atualizada));
    set({ usuaria: atualizada });
  },

  atualizarNome: async (nome) => {
    const usuaria = get().usuaria;
    if (!usuaria) return;
    const atualizada = { ...usuaria, nome_completo: nome };
    await gravar(CHAVE_CONTA, JSON.stringify(atualizada));
    set({ usuaria: atualizada });
  },

  sair: async ({ avisarServidor = true } = {}) => {
    if (avisarServidor && get().token) {
      // Se o servidor estiver fora do ar, a sessão local é apagada mesmo assim
      await apiUsuarias.logout().catch(() => undefined);
    }
    await Promise.all([apagarSessaoLocal(), apagar(CHAVE_DISFARCE_SEM_SESSAO), apagarCodigoLocal()]);
    set({ estado: 'deslogada', token: null, usuaria: null, semSessao: false });
  },
}));

/** A sessão acabou no servidor. Com o disfarce ligado, o app segue como calculadora. */
async function encerrarDisfarcada() {
  const disfarce = !!useSessao.getState().usuaria?.modo_disfarcado;
  await apagarSessaoLocal();
  if (disfarce && (await temCodigoLocal())) {
    await gravar(CHAVE_DISFARCE_SEM_SESSAO, '1');
    useSessao.setState({ estado: 'bloqueada', token: null, usuaria: null, semSessao: true });
  } else {
    await apagarCodigoLocal();
    useSessao.setState({ estado: 'deslogada', token: null, usuaria: null, semSessao: false });
  }
}

/** Renova o token de acesso sem código (só funciona com o disfarce desligado). */
async function renovarSessao(): Promise<string | null> {
  const refresh = await ler(CHAVE_REFRESH);
  if (!refresh) return null;
  try {
    const r = await apiUsuarias.renovarSessao(refresh);
    await gravar(CHAVE_REFRESH, r.refresh_token);
    await gravar(CHAVE_CONTA, JSON.stringify(r.usuaria));
    useSessao.setState({ token: r.access_token, usuaria: r.usuaria });
    return r.access_token;
  } catch (erro) {
    if (erro instanceof ErroApi && erro.dados.precisa_codigo) {
      useSessao.setState({ estado: 'bloqueada', token: null });
      return null;
    }
    if (erro instanceof ErroApi && erro.status === 401) {
      await encerrarDisfarcada();
    }
    return null;
  }
}

configurarAutenticacao({
  obterToken: () => useSessao.getState().token,
  renovar: async () => {
    if (useSessao.getState().usuaria?.modo_disfarcado) {
      useSessao.getState().bloquear();
      return null;
    }
    return renovarSessao();
  },
  aoExpirar: () => {
    const { estado, usuaria } = useSessao.getState();
    if (estado === 'ativa') useSessao.setState({ estado: usuaria?.modo_disfarcado ? 'bloqueada' : 'deslogada', token: null });
  },
});
