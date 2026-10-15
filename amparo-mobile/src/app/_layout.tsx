import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useInicializacaoApp } from '@/controllers/app';
import { CapaPrivacidade } from '@/views/components/dominio/CapaPrivacidade';
import { useTema } from '@/views/theme/tema';

export default function LayoutRaiz() {
  const { pronto, estado, clienteQuery } = useInicializacaoApp();
  const { nome, cores } = useTema();

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
