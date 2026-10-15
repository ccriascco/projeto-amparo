import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { useAnexos } from '@/models/stores/anexos';
import { abrirAjustesDoSistema } from '@/utils/permissoes';

// Gravação de áudio: começa sozinha ao abrir; parar anexa à ocorrência.
export function useTelaAudio() {
  const gravador = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const estado = useAudioRecorderState(gravador, 250);
  const adicionar = useAnexos((s) => s.adicionar);
  const [semPermissao, setSemPermissao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const iniciar = async () => {
    const p = await requestRecordingPermissionsAsync();
    setErro(null);
    if (!p.granted) {
      setSemPermissao(true);
      if (!p.canAskAgain) abrirAjustesDoSistema();
      return;
    }
    setSemPermissao(false);
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await gravador.prepareToRecordAsync();
      gravador.record();
    } catch {
      setErro('Não foi possível começar a gravar. Tente de novo.');
    }
  };

  useEffect(() => {
    // setState só acontece no retorno da promessa (pedido de permissão), não durante o efeito
    requestRecordingPermissionsAsync().then(() => iniciar());
    return () => {
      setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parar = async () => {
    try {
      await gravador.stop();
      if (gravador.uri) {
        const segundos = Math.round(estado.durationMillis / 1000);
        adicionar({
          uri: gravador.uri,
          nome: `audio-${Date.now()}.m4a`,
          mime: 'audio/mp4',
          tipo: 'audio',
          detalhe: `${Math.floor(segundos / 60)} min ${segundos % 60} s`,
        });
      }
      router.back();
    } catch {
      setErro('Não foi possível salvar a gravação.');
    }
  };

  const cancelar = async () => {
    if (estado.isRecording) await gravador.stop().catch(() => undefined);
    router.back();
  };

  return {
    gravando: estado.isRecording,
    duracaoMs: estado.durationMillis,
    semPermissao,
    erro,
    iniciar,
    parar,
    cancelar,
  };
}
