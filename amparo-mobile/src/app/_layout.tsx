import {
  NunitoSans_300Light,
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
} from '@expo-google-fonts/nunito-sans';
import { Quicksand_700Bold } from '@expo-google-fonts/quicksand';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErroApi } from '@/services/api/erros';
import { CapaPrivacidade } from '@/views/components/dominio/CapaPrivacidade';
import { useSessao } from '@/models/stores/sessao';
import { useTema } from '@/views/theme/tema';

SplashScreen.preventAutoHideAsync();

function novoClienteQuery() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // 401/403/404 não melhoram tentando de novo
        retry: (falhas, erro) => !(erro instanceof ErroApi && erro.status >= 400 && erro.status < 500) && falhas < 2,
      },
    },
  });
}

export default function LayoutRaiz() {
  const [fontesProntas] = useFonts({
    Quicksand_700Bold,
    NunitoSans_300Light,
    NunitoSans_400Regular,
    NunitoSans_500Medium,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
  });
  const [clienteQuery] = useState(novoClienteQuery);
  const { nome, cores } = useTema();
  const estado = useSessao((s) => s.estado);

  useEffect(() => {
    useSessao.getState().iniciar();
  }, []);

  // Com o Modo Disfarce ligado, sair do app trava de novo na calculadora
  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (s) => {
      if (s === 'background') useSessao.getState().bloquear();
    });
    return () => assinatura.remove();
  }, []);

  // Ao sair da conta, nada do cache da usuária anterior fica no aparelho
  useEffect(() => {
    if (estado === 'deslogada') clienteQuery.clear();
  }, [estado, clienteQuery]);

  const pronto = fontesProntas && estado !== 'iniciando';
  useEffect(() => {
    if (pronto) SplashScreen.hideAsync();
  }, [pronto]);

  if (!pronto) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={clienteQuery}>
          <StatusBar style={nome === 'escuro' || estado === 'bloqueada' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.tela } }}>
            <Stack.Protected guard={estado === 'deslogada'}>
              <Stack.Screen name="(publico)" />
            </Stack.Protected>
            <Stack.Protected guard={estado === 'bloqueada'}>
              <Stack.Screen name="disfarce" options={{ animation: 'none' }} />
            </Stack.Protected>
            <Stack.Protected guard={estado === 'ativa'}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
          </Stack>
          <CapaPrivacidade />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
