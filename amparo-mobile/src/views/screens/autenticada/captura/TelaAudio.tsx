import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTelaAudio } from '@/controllers/telas/autenticada/captura/useTelaAudio';
import { BotaoFechar, BotaoVoltar } from '@/views/components/ui/Basicos';
import { Botao } from '@/views/components/ui/Botao';
import { Texto } from '@/views/components/ui/Texto';
import { useTema } from '@/views/theme/tema';
import { fixas } from '@/views/theme/tokens';

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
  const { gravando, duracaoMs, semPermissao, erro, ...c } = useTelaAudio();

  return (
    <View style={{ flex: 1, backgroundColor: cores.tela, paddingTop: Math.max(insets.top + 16, 48), paddingHorizontal: 32, paddingBottom: 32 + insets.bottom, gap: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <BotaoVoltar onPress={c.cancelar} />
        <BotaoFechar onPress={c.cancelar} cor={cores.nota} borda={cores.borda20} rotulo="Cancelar gravação" />
      </View>

      <Texto accessibilityRole="header" peso={700} tamanho={31} style={{ lineHeight: 37 }}>
        {gravando ? 'Gravando áudio' : 'Áudio'}
      </Texto>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32 }}>
        {semPermissao ? (
          <>
            <Texto centro cor="textoSuave">
              Para gravar, o app precisa usar o microfone.
            </Texto>
            <Botao variante="secundario" onPress={c.iniciar}>
              Permitir microfone
            </Botao>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 120 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {ALTURAS.map((a, i) => (
                <Onda key={i} altura={a} indice={i} ativa={gravando} />
              ))}
            </View>
            <Texto peso={700} tamanho={31} style={{ lineHeight: 37, fontVariant: ['tabular-nums'] }} accessibilityLabel={`Tempo de gravação ${cronometro(duracaoMs)}`}>
              {cronometro(duracaoMs)}
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
          onPress={c.parar}
          disabled={!gravando}
          accessibilityRole="button"
          accessibilityLabel="Parar gravação e anexar"
          style={{ width: 76, height: 76, borderRadius: 999, borderWidth: 4, borderColor: cores.borda40, alignItems: 'center', justifyContent: 'center', opacity: gravando ? 1 : 0.5 }}
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
