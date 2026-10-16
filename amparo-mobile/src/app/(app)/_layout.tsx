import { Stack } from 'expo-router';

import { useTema } from '@/views/theme/tema';

export const unstable_settings = { initialRouteName: 'index' };

// Área autenticada. As abas (Início, Ocorrências, Rede, Mais) são telas da mesma pilha;
// a nav flutuante do design troca entre elas sem animação, como no protótipo.
// A localização vai uma vez só, no acionamento do SOS (não há reenvio periódico).
export default function LayoutApp() {
  const { cores } = useTema();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.tela } }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="ocorrencias/index" options={{ animation: 'none' }} />
      <Stack.Screen name="rede/index" options={{ animation: 'none' }} />
      <Stack.Screen name="mais/index" options={{ animation: 'none' }} />
      <Stack.Screen name="emergencia" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
