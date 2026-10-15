import { requestRecordingPermissionsAsync } from 'expo-audio';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { Linking } from 'react-native';

// Permissões do aparelho. Recusar nunca bloqueia o uso do app: só desliga o recurso.

export async function pedirLocalizacao(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function pedirCameraEMicrofone(): Promise<boolean> {
  const [camera, microfone, gravacao] = await Promise.all([
    Camera.requestCameraPermissionsAsync(),
    Camera.requestMicrophonePermissionsAsync(),
    requestRecordingPermissionsAsync(),
  ]);
  return camera.granted && microfone.granted && gravacao.granted;
}

export async function situacaoPermissoes() {
  const [local, camera, microfone] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Camera.getCameraPermissionsAsync(),
    Camera.getMicrophonePermissionsAsync(),
  ]);
  return { local: local.granted, camera: camera.granted && microfone.granted };
}

/** Localização atual, sem travar o fluxo: tenta a última conhecida e depois a atual (até 8 s). */
export async function localizacaoAtual(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted) return null;
    const ultima = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
    if (ultima) return { latitude: ultima.coords.latitude, longitude: ultima.coords.longitude };
    const atual = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((r) => setTimeout(() => r(null), 8000)),
    ]);
    return atual ? { latitude: atual.coords.latitude, longitude: atual.coords.longitude } : null;
  } catch {
    return null;
  }
}

/** Revogar uma permissão só é possível nos ajustes do sistema */
export function abrirAjustesDoSistema() {
  Linking.openSettings();
}
