import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icone } from '@/views/components/ui/Icone';
import { Texto } from '@/views/components/ui/Texto';
import { fixas, raios } from '@/views/theme/tokens';

// SOS do Início: três anéis vermelhos (200/190/180 px) e o núcleo de 170 px.
// O design pede "toque e segure por alguns segundos": o acionamento só acontece
// depois de SEGURAR por TEMPO_SEGURAR_MS, com um anel que cresce enquanto ela segura.
export const TEMPO_SEGURAR_MS = 3000;

type Props = { aoAcionar: () => void; desabilitado?: boolean; testID?: string };

export function BotaoSOS({ aoAcionar, desabilitado = false, testID }: Props) {
  const progresso = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [segurando, setSegurando] = useState(false);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const iniciar = () => {
    if (desabilitado) return;
    setSegurando(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    progresso.value = withTiming(1, { duration: TEMPO_SEGURAR_MS, easing: Easing.linear });
    timer.current = setTimeout(() => {
      timer.current = null;
      setSegurando(false);
      progresso.value = 0;
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      aoAcionar();
    }, TEMPO_SEGURAR_MS);
  };

  const cancelar = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setSegurando(false);
    cancelAnimation(progresso);
    progresso.value = withTiming(0, { duration: 200 });
  };

  const estiloProgresso = useAnimatedStyle(() => ({
    opacity: interpolate(progresso.value, [0, 0.05, 1], [0, 0.35, 0.5]),
    transform: [{ scale: interpolate(progresso.value, [0, 1], [0.85, 1.18]) }],
  }));

  return (
    <Pressable
      testID={testID}
      onPressIn={iniciar}
      onPressOut={cancelar}
      disabled={desabilitado}
      accessibilityRole="button"
      accessibilityLabel="SOS, pedir ajuda à sua rede"
      accessibilityHint="Toque duas vezes e mantenha pressionado por 3 segundos para acionar a emergência silenciosa."
      accessibilityState={{ disabled: desabilitado, busy: segurando }}
      accessibilityActions={[{ name: 'longpress', label: 'Acionar emergência' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'longpress') aoAcionar();
      }}
      style={{ alignSelf: 'center', width: 200, height: 200, alignItems: 'center', justifyContent: 'center', opacity: desabilitado ? 0.5 : 1 }}
    >
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', width: 200, height: 200, borderRadius: raios.pilula, backgroundColor: fixas.sos }, estiloProgresso]}
      />
      <View style={anel(200, 0.1)} />
      <View style={anel(190, 0.18)} />
      <View style={anel(180, 0.28)} />
      <View
        style={{
          width: 170,
          height: 170,
          borderRadius: raios.pilula,
          backgroundColor: segurando ? fixas.sosPressionado : fixas.sos,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <Icone nome="triangle-alert" tamanho={40} cor="#FFFFFF" />
        <Texto peso={700} tamanho={39} corLivre="#FFFFFF" style={{ lineHeight: 42 }}>
          SOS
        </Texto>
      </View>
    </Pressable>
  );
}

function anel(tamanho: number, alfa: number) {
  return {
    position: 'absolute' as const,
    width: tamanho,
    height: tamanho,
    borderRadius: raios.pilula,
    backgroundColor: `rgba(198,40,40,${alfa})`,
  };
}
