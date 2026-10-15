import { router } from 'expo-router';
import { useState } from 'react';

import { useOcorrencias } from '@/controllers/dados';
import { useTelaPrivada } from '@/controllers/privacidade';
import { MENSAGEM_CARREGAR, mensagemDeErro } from '@/services/api/erros';

// Aba Ocorrências: total, últimos registros e os textos de ajuda. Tela protegida contra print.
export function useTelaOcorrencias() {
  useTelaPrivada();
  const ocorrencias = useOcorrencias();
  const [info, setInfo] = useState<{ titulo: string; texto: string } | null>(null);
  const lista = ocorrencias.data?.ocorrencias ?? [];
  const total = ocorrencias.data?.total ?? 0;

  return {
    lista,
    total,
    carregando: ocorrencias.isLoading,
    erroCarregar: ocorrencias.isError ? mensagemDeErro(ocorrencias.error, MENSAGEM_CARREGAR) : null,
    carregou: ocorrencias.isSuccess,
    atualizando: ocorrencias.isRefetching,
    atualizar: () => ocorrencias.refetch(),
    info,
    mostrarInfo: setInfo,
    fecharInfo: () => setInfo(null),
    novaOcorrencia: () => router.push('/ocorrencias/nova'),
    verTodas: () => router.push('/ocorrencias/todas'),
  };
}
