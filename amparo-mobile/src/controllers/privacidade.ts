import { usePreventScreenCapture } from 'expo-screen-capture';
import { Platform } from 'react-native';

// Bloqueia print e gravação de tela nas telas com ocorrências e provas.
// Na versão web (só para desenvolvimento) o navegador não permite esse bloqueio.
const naWeb = Platform.OS === 'web';

export function useTelaPrivada() {
  if (!naWeb) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Platform.OS não muda durante a execução
    usePreventScreenCapture();
  }
}
