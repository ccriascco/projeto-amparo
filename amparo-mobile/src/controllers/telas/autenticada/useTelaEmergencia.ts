import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';

import { chaves, useEmergencia } from '@/controllers/dados';
import { apiEmergencias } from '@/services/api/endpoints';
import { mensagemDeErro } from '@/services/api/erros';

// "Alerta enviado": quem foi avisada (atualiza a cada 10 s) e "Cancelar aviso" (encerra a emergência).
export function useTelaEmergencia() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const situacao = useEmergencia(id);

  const encerrar = useMutation({
    mutationFn: () => apiEmergencias.encerrar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chaves.emergenciaAtiva });
      qc.invalidateQueries({ queryKey: chaves.perfil });
      router.navigate('/');
    },
  });

  return {
    avisos: situacao.data?.avisos ?? [],
    encerrada: situacao.data?.emergencia?.status === 'ENCERRADA',
    carregou: situacao.isSuccess,
    carregando: situacao.isLoading,
    erroSituacao: situacao.isError ? mensagemDeErro(situacao.error, 'Não foi possível atualizar agora.') : null,
    cancelarAviso: () => encerrar.mutate(),
    cancelando: encerrar.isPending,
    erroCancelar: encerrar.isError ? mensagemDeErro(encerrar.error, 'Não foi possível cancelar o aviso.') : null,
    irParaInicio: () => router.navigate('/'),
  };
}
