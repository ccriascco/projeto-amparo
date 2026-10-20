import { View } from 'react-native';

import { Texto } from './Texto';

// Título + subtítulo das telas em etapas (cadastro e recuperação de senha).
export function CabecalhoEtapa({ titulo, sub, tamanho = 31 }: { titulo: string; sub: string; tamanho?: number }) {
  return (
    <View style={{ gap: 4 }}>
      <Texto accessibilityRole="header" peso={700} tamanho={tamanho} style={{ lineHeight: Math.round(tamanho * 1.2) }}>
        {titulo}
      </Texto>
      <Texto variante="subtitulo">{sub}</Texto>
    </View>
  );
}
