import { Stack } from 'expo-router';

import { RastreadorEmergencia } from '@/components/dominio/RastreadorEmergencia';
import { useTema } from '@/theme/tema';

export const unstable_settings = { initialRouteName: 'index' };

// Área autenticada. As abas (Início, Ocorrências, Rede, Mais) são telas da mesma pilha;
// a nav flutuante do design troca entre elas sem animação, como no protótipo.
export default function LayoutApp() {
  const { cores } = useTema();
  return (
    <>
      <RastreadorEmergencia />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.tela } }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="ocorrencias/index" options={{ animation: 'none' }} />
        <Stack.Screen name="rede/index" options={{ animation: 'none' }} />
        <Stack.Screen name="mais/index" options={{ animation: 'none' }} />
        <Stack.Screen name="emergencia" options={{ gestureEnabled: false }} />
      </Stack>
    </>
  );
}
