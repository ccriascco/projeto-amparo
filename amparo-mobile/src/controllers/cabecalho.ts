import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { chaves } from '@/controllers/dados';
import type { Perfil } from '@/models/tipos';
import { useSessao } from '@/models/stores/sessao';
import { apiUsuarias } from '@/services/api/endpoints';
import { iniciais } from '@/utils/texto';
import type { Aba } from '@/views/components/layout/AppNav';

// Ações da casca das telas internas: cabeçalho (atalhos e avatar) e nav das abas.
export const ROTA_DA_ABA: Record<Aba, '/' | '/ocorrencias' | '/rede' | '/mais'> = {
  inicio: '/',
  documentacao: '/ocorrencias',
  rede: '/rede',
  mais: '/mais',
};

export function irParaAba(aba: Aba) {
  router.navigate(ROTA_DA_ABA[aba]);
}

/**
 * Atalhos do cabeçalho: sino → Rede, calculadora → esconde o app na calculadora
 * (precisa de um código de 4 números definido), engrenagem → Mais.
 */
export function useAcoesCabecalho() {
  const qc = useQueryClient();
  return {
    aoNotificacoes: () => router.navigate('/rede'),
    aoCalculadora: async () => {
      const perfil =
        qc.getQueryData<Perfil>(chaves.perfil) ??
        (await qc.fetchQuery({ queryKey: chaves.perfil, queryFn: apiUsuarias.perfil }).catch(() => null));
      if (perfil?.codigo_disfarce_definido || useSessao.getState().usuaria?.modo_disfarcado) useSessao.getState().travar();
      else router.navigate({ pathname: '/mais/codigo', params: { motivo: 'calculadora' } });
    },
    aoConfiguracoes: () => router.navigate('/mais'),
  };
}

/** Nome e iniciais da usuária para o avatar do cabeçalho. */
export function useUsuariaCabecalho() {
  const nome = useSessao((s) => s.usuaria?.nome_completo);
  return { nome, iniciais: iniciais(nome) };
}
