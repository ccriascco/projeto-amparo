import { StyleSheet, View } from 'react-native';

import { useCapaPrivacidade } from '@/controllers/privacidade';

import { Calculadora } from './Calculadora';

// "Multitarefas" do protótipo: com o Modo Disfarce ligado, ao minimizar o app a prévia
// do sistema mostra só uma calculadora, nunca o conteúdo do Amparo.
export function CapaPrivacidade() {
  const { visivel } = useCapaPrivacidade();

  if (!visivel) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Calculadora estatica />
    </View>
  );
}
