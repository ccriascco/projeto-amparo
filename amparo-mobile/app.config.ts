import type { ConfigContext, ExpoConfig } from 'expo/config';

// O plugin do Google Sign-In só entra quando os IDs do Google estão configurados no .env.
// Sem eles o app compila normalmente e o botão "Entrar com Google" avisa que não está configurado.
export default ({ config }: ConfigContext): ExpoConfig => {
  const esquemaIos = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  const plugins = [...(config.plugins ?? [])];
  if (esquemaIos) plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: esquemaIos }]);
  return { ...(config as ExpoConfig), plugins };
};
