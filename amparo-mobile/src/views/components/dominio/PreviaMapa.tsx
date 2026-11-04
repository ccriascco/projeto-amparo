import { Image } from 'expo-image';
import { View } from 'react-native';

import { Icone } from '@/views/components/ui/Icone';
import { useTema } from '@/views/theme/tema';

export type Local = { latitude: number; longitude: number };

export const ROTULO_MAPA = 'Mapa com a localização enviada no pedido de ajuda';
export const ROTULO_SEM_LOCAL = 'Prévia do mapa. A localização não foi enviada neste pedido.';

// Imagem ilustrativa do design, usada quando não há mapa real: localização não enviada,
// ainda carregando ou mapa indisponível (Android sem chave do Google Maps).
export function PreviaMapa({ rotulo }: { rotulo: string }) {
  const { cores } = useTema();
  return (
    <View style={{ flex: 1 }} accessible accessibilityLabel={rotulo} testID="mapa-previa">
      <Image source={require('@/assets/images/mapa-previa.png')} contentFit="cover" style={{ width: '100%', height: '100%' }} />
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Icone nome="map-pin" tamanho={32} cor={cores.acento} />
      </View>
    </View>
  );
}
