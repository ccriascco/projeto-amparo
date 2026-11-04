import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';

import { chaves, useEmergencia, useRotaEmergencia } from '@/controllers/dados';
import type { PontoGps } from '@/models/tipos';
import { apiEmergencias } from '@/services/api/endpoints';
import { mensagemDeErro } from '@/services/api/erros';

/** Último ponto válido da rota, já como número (o banco devolve texto). */
export function localDaRota(pontos: PontoGps[] | undefined): { latitude: number; longitude: number } | null {
  const ultimo = pontos?.at(-1);
  if (!ultimo) return null;
  const latitude = Number(ultimo.latitude);
  const longitude = Number(ultimo.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

// "Alerta enviado": mapa com a localização enviada, quem foi avisada (atualiza a cada 10 s)
// e "Cancelar aviso" (encerra a emergência).
export function useTelaEmergencia() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const situacao = useEmergencia(id);
  const rota = useRotaEmergencia(id);

  const encerrar = useMutation({
    mutationFn: () => apiEmergencias.encerrar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chaves.emergenciaAtiva });
      qc.invalidateQueries({ queryKey: chaves.perfil });
      router.navigate('/');
    },
  });

  return {
    local: localDaRota(rota.data?.rastro_gps),
    localCarregando: rota.isLoading,
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
