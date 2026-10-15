import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useOcorrencia, useRemoverOcorrencia } from '@/controllers/dados';
import { useTelaPrivada } from '@/controllers/privacidade';
import { MENSAGEM_CARREGAR, mensagemDeErro } from '@/services/api/erros';

// Resumo de uma ocorrência: abrir provas, editar e apagar. Tela protegida contra print.
export function useTelaResumoOcorrencia() {
  useTelaPrivada();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ocorrencia = useOcorrencia(id);
  const remover = useRemoverOcorrencia();
  const [confirmando, setConfirmando] = useState(false);

  return {
    ocorrencia: ocorrencia.data,
    carregando: ocorrencia.isLoading,
    erroCarregar: ocorrencia.isError ? mensagemDeErro(ocorrencia.error, MENSAGEM_CARREGAR) : null,
    tentarDeNovo: () => ocorrencia.refetch(),
    abrirEvidencia: (evidenciaId: string, titulo: string) =>
      router.push({ pathname: '/ocorrencias/evidencia', params: { ocorrenciaId: id, evidenciaId, titulo } }),
    editar: () => router.push({ pathname: '/ocorrencias/nova', params: { id } }),
    confirmando,
    pedirExclusao: () => setConfirmando(true),
    fecharExclusao: () => {
      setConfirmando(false);
      remover.reset();
    },
    apagar: () => remover.mutate(id, { onSuccess: () => router.navigate('/ocorrencias') }),
    apagando: remover.isPending,
    erroApagar: remover.isError ? mensagemDeErro(remover.error, 'Não foi possível apagar.') : null,
  };
}
