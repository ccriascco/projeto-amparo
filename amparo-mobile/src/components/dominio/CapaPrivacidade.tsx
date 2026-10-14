import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus, StyleSheet, View } from 'react-native';

import { useSessao } from '@/store/sessao';

import { Calculadora } from './Calculadora';

// "Multitarefas" do protótipo: com o Modo Disfarce ligado, ao minimizar o app a prévia
// do sistema mostra só uma calculadora, nunca o conteúdo do Amparo.
export function CapaPrivacidade() {
  const disfarce = useSessao((s) => !!s.usuaria?.modo_disfarcado);
  const [estadoApp, setEstadoApp] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const assinatura = AppState.addEventListener('change', setEstadoApp);
    return () => assinatura.remove();
  }, []);

  if (!disfarce || estadoApp === 'active') return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Calculadora estatica />
    </View>
  );
}
