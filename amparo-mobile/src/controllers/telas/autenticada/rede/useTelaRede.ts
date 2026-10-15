import { router } from 'expo-router';
import { useState } from 'react';

import { useGuardioes } from '@/controllers/dados';
import { MENSAGEM_CARREGAR, mensagemDeErro } from '@/services/api/erros';

const MAXIMO = 5;

// Lista da rede de apoio: confirmadas primeiro, limite de 5 e os textos de ajuda.
export function useTelaRede() {
  const guardioes = useGuardioes();
  const [info, setInfo] = useState<{ titulo: string; texto: string } | null>(null);

  // Confirmadas primeiro, depois as que ainda não aceitaram (ordem do protótipo)
  const lista = [...(guardioes.data ?? [])].sort((a, b) => Number(b.status_convite === 'CONFIRMADO') - Number(a.status_convite === 'CONFIRMADO'));
  const cheia = lista.length >= MAXIMO;

  return {
    lista,
    cheia,
    carregando: guardioes.isLoading,
    erroCarregar: guardioes.isError ? mensagemDeErro(guardioes.error, MENSAGEM_CARREGAR) : null,
    carregou: guardioes.isSuccess,
    atualizando: guardioes.isRefetching,
    atualizar: () => guardioes.refetch(),
    info,
    mostrarInfo: setInfo,
    fecharInfo: () => setInfo(null),
    abrirGuardia: (id: string) => router.push({ pathname: '/rede/guardia', params: { id } }),
    adicionarGuardia: () => router.push('/rede/guardia'),
  };
}
