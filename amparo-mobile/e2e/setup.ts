// Ambiente do E2E: API apontando para o backend de demonstração (porta própria) e
// SecureStore em memória. A rede só vai para esse backend local.
const porta = process.env.E2E_PORTA || '3100';
process.env.EXPO_PUBLIC_API_URL = `http://127.0.0.1:${porta}`;

// O ambiente de teste do React Native troca o fetch por um falso; aqui ele vira um fetch mínimo
// sobre o http do Node, que só aceita o backend local (JSON; uploads não fazem parte deste fluxo).
const http = jest.requireActual('http') as typeof import('http');
globalThis.fetch = ((url: RequestInfo | URL, init: RequestInit = {}) => {
  const destino = String(url);
  if (!destino.startsWith(`http://127.0.0.1:${porta}`)) {
    return Promise.reject(new Error(`Rede bloqueada no E2E: ${destino}`));
  }
  return new Promise((resolve, reject) => {
    const req = http.request(destino, { method: init.method ?? 'GET', headers: init.headers as Record<string, string> }, (res) => {
      let texto = '';
      res.setEncoding('utf8');
      res.on('data', (c: string) => (texto += c));
      res.on('end', () => {
        const status = res.statusCode ?? 0;
        resolve({ ok: status >= 200 && status < 300, status, text: async () => texto, json: async () => JSON.parse(texto) } as Response);
      });
    });
    req.on('error', reject);
    init.signal?.addEventListener('abort', () => req.destroy(new Error('aborted')));
    if (typeof init.body === 'string') req.write(init.body);
    req.end();
  });
}) as typeof fetch;

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('expo-secure-store', () => {
  const dados = new Map<string, string>();
  return {
    getItemAsync: async (k: string) => dados.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => void dados.set(k, v),
    deleteItemAsync: async (k: string) => void dados.delete(k),
  };
});
jest.mock('expo-crypto', () => {
  const { createHash, randomUUID } = jest.requireActual('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: async (_a: string, t: string) => createHash('sha256').update(t).digest('hex'),
    digest: async (_a: string, b: Uint8Array) => createHash('sha256').update(b).digest().buffer,
    randomUUID: () => randomUUID(),
  };
});

// Módulos nativos sem implementação no ambiente de teste: só o necessário para as telas abrirem.
// Sem permissões concedidas, o app segue sem localização/câmera (como no celular quando ela recusa).
const negado = { granted: false, status: 'denied', canAskAgain: true };
jest.mock('expo-audio', () => ({
  requestRecordingPermissionsAsync: async () => negado,
  setAudioModeAsync: async () => undefined,
  useAudioRecorder: () => ({ prepareToRecordAsync: async () => undefined, record: () => undefined, stop: async () => undefined, uri: null }),
  useAudioRecorderState: () => ({ isRecording: false, durationMillis: 0 }),
  useAudioPlayer: () => ({ play: () => undefined, pause: () => undefined, seekTo: () => undefined }),
  useAudioPlayerStatus: () => ({ playing: false, currentTime: 0, duration: 0, didJustFinish: false }),
  RecordingPresets: { HIGH_QUALITY: {} },
}));
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: async () => negado,
    requestMicrophonePermissionsAsync: async () => negado,
    getCameraPermissionsAsync: async () => negado,
    getMicrophonePermissionsAsync: async () => negado,
  },
  CameraView: () => null,
  useCameraPermissions: () => [negado, async () => negado],
  useMicrophonePermissions: () => [negado, async () => negado],
}));
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: async () => negado,
  getForegroundPermissionsAsync: async () => negado,
  getLastKnownPositionAsync: async () => null,
  getCurrentPositionAsync: async () => null,
  Accuracy: { Balanced: 3 },
}));
jest.mock('expo-video', () => ({ useVideoPlayer: () => ({}), VideoView: () => null }));
jest.mock('expo-screen-capture', () => ({ usePreventScreenCapture: () => undefined }));
jest.mock('expo-haptics', () => ({
  impactAsync: async () => undefined,
  notificationAsync: async () => undefined,
  selectionAsync: async () => undefined,
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Warning: 'warning' },
}));

// Ícone alternativo do Modo Disfarce: módulo nativo, sem implementação no ambiente de teste
jest.mock('expo-alternate-app-icons', () => ({
  supportsAlternateIcons: false,
  getAppIconName: () => null,
  setAlternateAppIcon: async () => null,
}));
