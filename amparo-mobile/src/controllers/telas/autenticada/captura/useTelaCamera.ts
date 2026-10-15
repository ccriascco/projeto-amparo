import { type CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';

import { useTelaPrivada } from '@/controllers/privacidade';
import { LIMITE_MB, problemaDoArquivo, useAnexos } from '@/models/stores/anexos';
import { abrirAjustesDoSistema } from '@/utils/permissoes';

// Captura de foto ou vídeo. O arquivo fica no cache do app, nunca na galeria,
// e entra como anexo da ocorrência que está sendo registrada. Tela protegida contra print.
export function useTelaCamera() {
  useTelaPrivada();
  const { modo } = useLocalSearchParams<{ modo?: 'foto' | 'video' }>();
  const video = modo === 'video';
  const camera = useRef<CameraView>(null);
  const [permCamera, pedirCamera] = useCameraPermissions();
  const [permMicrofone, pedirMicrofone] = useMicrophonePermissions();
  const [pronta, setPronta] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const adicionar = useAnexos((s) => s.adicionar);
  const capturados = useAnexos((s) => s.anexos.filter((a) => a.tipo === (video ? 'video' : 'foto')).length);

  const temPermissao = permCamera?.granted && (!video || permMicrofone?.granted);

  const capturar = async () => {
    if (!camera.current || !pronta) return;
    setErro(null);
    try {
      if (!video) {
        const foto = await camera.current.takePictureAsync({ quality: 0.7 });
        const problema = problemaDoArquivo(foto.uri, 'image/jpeg');
        if (problema) return setErro(problema);
        adicionar({ uri: foto.uri, nome: `foto-${Date.now()}.jpg`, mime: 'image/jpeg', tipo: 'foto' });
        return;
      }
      if (gravando) {
        camera.current.stopRecording();
        return;
      }
      setGravando(true);
      const r = await camera.current.recordAsync({ maxDuration: 120, maxFileSize: LIMITE_MB.video * 1024 * 1024 });
      setGravando(false);
      if (r?.uri) {
        const mime = r.uri.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
        adicionar({ uri: r.uri, nome: `video-${Date.now()}.${mime === 'video/quicktime' ? 'mov' : 'mp4'}`, mime, tipo: 'video' });
      }
    } catch {
      setGravando(false);
      setErro('Não foi possível usar a câmera agora. Tente de novo.');
    }
  };

  return {
    video,
    camera,
    temPermissao,
    pronta,
    gravando,
    erro,
    capturados,
    aoCameraPronta: () => setPronta(true),
    pedirPermissao: async () => {
      const c = await pedirCamera();
      const m = video ? await pedirMicrofone() : { granted: true, canAskAgain: true };
      if ((!c.granted && !c.canAskAgain) || (!m.granted && !m.canAskAgain)) abrirAjustesDoSistema();
    },
    capturar,
    voltar: () => router.back(),
  };
}
