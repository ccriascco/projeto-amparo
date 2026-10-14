import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotaoFechar, BotaoVoltar } from '@/components/ui/Basicos';
import { Botao } from '@/components/ui/Botao';
import { Texto } from '@/components/ui/Texto';
import { useAnexos } from '@/store/anexos';
import { useTema } from '@/theme/tema';
import { fixas } from '@/theme/tokens';
import { abrirAjustesDoSistema } from '@/utils/permissoes';

const ALTURAS = [28, 52, 84, 44, 108, 62, 34, 96, 70, 40, 116, 46, 78, 100, 36, 66, 90, 30, 74, 54, 26];

function Onda({ altura, indice, ativa }: { altura: number; indice: number; ativa: boolean }) {
  const { cores } = useTema();
  const escala = useSharedValue(1);
  useEffect(() => {
    // Animação "amparo-onda" do design: scaleY 0,35 ↔ 1 em 1,1 s, com atraso de 60 ms por barra
    escala.value = ativa
      ? withDelay(indice * 60, withRepeat(withSequence(withTiming(0.35, { duration: 550 }), withTiming(1, { duration: 550 })), -1))
      : withTiming(0.35);
  }, [ativa, indice, escala]);
  const estilo = useAnimatedStyle(() => ({ transform: [{ scaleY: escala.value }] }));
  return (
    <Animated.View
      style={[{ width: 5, height: altura, borderRadius: 999, backgroundColor: cores.acento, opacity: indice % 3 === 0 ? 1 : 0.55 }, estilo]}
    />
  );
}

const cronometro = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// Gravação de áudio: começa sozinha ao abrir; o quadrado vermelho para e anexa à ocorrência.
export default function TelaAudio() {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
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

  return (
    <View style={{ flex: 1, backgroundColor: cores.tela, paddingTop: Math.max(insets.top + 16, 48), paddingHorizontal: 32, paddingBottom: 32 + insets.bottom, gap: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <BotaoVoltar onPress={cancelar} />
        <BotaoFechar onPress={cancelar} cor={cores.nota} borda={cores.borda20} rotulo="Cancelar gravação" />
      </View>

      <Texto accessibilityRole="header" peso={700} tamanho={31} style={{ lineHeight: 37 }}>
        {estado.isRecording ? 'Gravando áudio' : 'Áudio'}
      </Texto>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32 }}>
        {semPermissao ? (
          <>
            <Texto centro cor="textoSuave">
              Para gravar, o app precisa usar o microfone.
            </Texto>
            <Botao variante="secundario" onPress={iniciar}>
              Permitir microfone
            </Botao>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 120 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {ALTURAS.map((a, i) => (
                <Onda key={i} altura={a} indice={i} ativa={estado.isRecording} />
              ))}
            </View>
            <Texto peso={700} tamanho={31} style={{ lineHeight: 37, fontVariant: ['tabular-nums'] }} accessibilityLabel={`Tempo de gravação ${cronometro(estado.durationMillis)}`}>
              {cronometro(estado.durationMillis)}
            </Texto>
          </>
        )}
        {erro ? (
          <Texto variante="nota" corLivre={fixas.sos} centro>
            {erro}
          </Texto>
        ) : null}
      </View>

      <View style={{ alignItems: 'center', gap: 16 }}>
        <Pressable
          onPress={parar}
          disabled={!estado.isRecording}
          accessibilityRole="button"
          accessibilityLabel="Parar gravação e anexar"
          style={{ width: 76, height: 76, borderRadius: 999, borderWidth: 4, borderColor: cores.borda40, alignItems: 'center', justifyContent: 'center', opacity: estado.isRecording ? 1 : 0.5 }}
        >
          <View style={{ width: 26, height: 26, borderRadius: 4, backgroundColor: fixas.sos }} />
        </Pressable>
        <Texto variante="nota" centro>
          Toque no quadrado para parar. O áudio fica no cofre, nunca na galeria.
        </Texto>
      </View>
    </View>
  );
}
