// Ambiente dos testes: a URL da API é fictícia e qualquer rede real é bloqueada
// (os testes nunca falam com o backend de produção).
process.env.EXPO_PUBLIC_API_URL = 'http://api.teste.invalid';

const fetchBloqueado = (url: unknown) => {
  throw new Error(`Rede bloqueada nos testes: ${String(url)}. Use o mock de fetch do próprio teste.`);
};
globalThis.fetch = fetchBloqueado as unknown as typeof fetch;

// Reanimated 4 / Worklets: usar os mocks oficiais no Jest
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Ícone alternativo do Modo Disfarce: módulo nativo, sem implementação no ambiente de teste
jest.mock('expo-alternate-app-icons', () => ({
  supportsAlternateIcons: false,
  getAppIconName: () => null,
  setAlternateAppIcon: async () => null,
}));

// react-native-maps é nativo: nos testes vira View simples
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = (props: object) => React.createElement(View, props);
  const Marker = (props: object) => React.createElement(View, { ...props, testID: 'mapa-marcador' });
  return { __esModule: true, default: MapView, Marker };
});
