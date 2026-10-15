import { usePreventScreenCapture } from 'expo-screen-capture';
import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { useSessao } from '@/models/stores/sessao';

// Bloqueia print e gravação de tela nas telas com ocorrências e provas.
// Na versão web (só para desenvolvimento) o navegador não permite esse bloqueio.
const naWeb = Platform.OS === 'web';

export function useTelaPrivada() {
  if (!naWeb) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Platform.OS não muda durante a execução
    usePreventScreenCapture();
  }
}

// "Multitarefas" do protótipo: com o Modo Disfarce ligado, ao minimizar o app a prévia
// do sistema mostra só uma calculadora, nunca o conteúdo do Amparo.
export function useCapaPrivacidade() {
  const disfarce = useSessao((s) => !!s.usuaria?.modo_disfarcado);
  const [estadoApp, setEstadoApp] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const assinatura = AppState.addEventListener('change', setEstadoApp);
    return () => assinatura.remove();
  }, []);

  return { visivel: disfarce && estadoApp !== 'active' };
}
