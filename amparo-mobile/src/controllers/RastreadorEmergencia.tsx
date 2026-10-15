import { useEffect } from 'react';
import { AppState } from 'react-native';

import { apiEmergencias } from '@/services/api/endpoints';
import { useEmergenciaAtiva } from '@/controllers/dados';
import { localizacaoAtual } from '@/utils/permissoes';

export const INTERVALO_LOCALIZACAO_MS = 30_000;

// Enquanto houver um pedido de ajuda ativo e o app estiver aberto, a localização é
// reenviada a cada 30 s (como diz o design). Com o app em segundo plano o envio para:
// isso exigiria permissão de localização em segundo plano (pendência registrada).
export function RastreadorEmergencia() {
  const ativa = useEmergenciaAtiva();
  const id = ativa.data?.emergencia?.id;

  useEffect(() => {
    if (!id) return;
    let cancelado = false;
    const enviar = async () => {
      if (AppState.currentState !== 'active') return;
      const local = await localizacaoAtual();
      if (local && !cancelado) await apiEmergencias.enviarLocalizacao(id, local).catch(() => undefined);
    };
    const timer = setInterval(enviar, INTERVALO_LOCALIZACAO_MS);
    return () => {
      cancelado = true;
      clearInterval(timer);
    };
  }, [id]);

  return null;
}
