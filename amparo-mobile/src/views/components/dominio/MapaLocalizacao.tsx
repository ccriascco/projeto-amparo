import Constants from 'expo-constants';
import { Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { type Local, PreviaMapa, ROTULO_MAPA, ROTULO_SEM_LOCAL } from '@/views/components/dominio/PreviaMapa';
import { useTema } from '@/views/theme/tema';

// No Android o mapa é o Google Maps, que só funciona com a chave configurada no build
// (GOOGLE_MAPS_ANDROID_API_KEY). Sem ela, fica a imagem do design. No iPhone é o Apple Maps.
const mapaDisponivel = Platform.OS !== 'android' || Constants.expoConfig?.extra?.mapaAndroid === true;

// Mapa da tela "Alerta enviado": mostra só o ponto enviado no acionamento.
// Não acompanha a posição em tempo real (showsUserLocation desligado).
export function MapaLocalizacao({ local }: { local: Local | null }) {
  const { cores } = useTema();
  if (!local) return <PreviaMapa rotulo={ROTULO_SEM_LOCAL} />;
  if (!mapaDisponivel) return <PreviaMapa rotulo={ROTULO_MAPA} />;
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{ ...local, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
      scrollEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      toolbarEnabled={false}
      showsUserLocation={false}
      accessibilityLabel={ROTULO_MAPA}
      testID="mapa-sos"
    >
      <Marker coordinate={local} pinColor={cores.acento} />
    </MapView>
  );
}
