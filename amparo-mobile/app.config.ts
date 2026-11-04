import type { ConfigContext, ExpoConfig } from 'expo/config';

// Configurações que dependem do .env.
// O plugin do Google Sign-In só entra quando os IDs do Google estão configurados no .env.
// Sem eles o app compila normalmente e o botão "Entrar com Google" avisa que não está configurado.
export default ({ config }: ConfigContext): ExpoConfig => {
  const esquemaIos = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  const plugins = [...(config.plugins ?? [])];
  if (esquemaIos) plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: esquemaIos }]);
  // Mapa da tela "Alerta enviado": no Android é o Google Maps e precisa da chave. Sem ela o app mostra
  // a imagem do design no lugar do mapa. No iPhone é o Apple Maps, sem chave.
  const chaveMapsAndroid = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  if (chaveMapsAndroid) plugins.push(['react-native-maps', { androidGoogleMapsApiKey: chaveMapsAndroid }]);
  return { ...(config as ExpoConfig), plugins, extra: { ...config.extra, mapaAndroid: !!chaveMapsAndroid } };
};
