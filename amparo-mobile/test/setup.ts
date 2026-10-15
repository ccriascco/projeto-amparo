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
