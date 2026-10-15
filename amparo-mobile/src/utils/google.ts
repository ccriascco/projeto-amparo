import { ErroApi } from '@/api/erros';

// Adaptador do Google Sign-In: devolve o id_token que o backend confere.
// Precisa de um development build (não funciona no Expo Go) e dos IDs no .env.
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export const googleConfigurado = () => !!webClientId;

let configurado = false;

/** Abre a escolha de conta do Google. Devolve o id_token, ou null se a pessoa cancelar. */
export async function obterIdTokenGoogle(): Promise<string | null> {
  if (!webClientId) {
    throw new ErroApi('http', 503, 'O login com Google ainda não foi configurado neste aparelho.');
  }
  let modulo: typeof import('@react-native-google-signin/google-signin');
  try {
    modulo = await import('@react-native-google-signin/google-signin');
  } catch {
    throw new ErroApi('http', 503, 'O login com Google precisa da versão instalada do app (não funciona no Expo Go).');
  }
  const { GoogleSignin, isSuccessResponse, statusCodes } = modulo;
  if (!configurado) {
    GoogleSignin.configure({ webClientId, iosClientId });
    configurado = true;
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const resposta = await GoogleSignin.signIn();
    if (!isSuccessResponse(resposta)) return null;
    // A sessão do Google no aparelho não é mantida: só o id_token é usado, uma vez
    await GoogleSignin.signOut().catch(() => undefined);
    if (!resposta.data.idToken) throw new ErroApi('http', 401, 'O Google não devolveu a identificação da conta. Tente de novo.');
    return resposta.data.idToken;
  } catch (erro) {
    if (erro instanceof ErroApi) throw erro;
    if ((erro as { code?: string }).code === statusCodes.SIGN_IN_CANCELLED) return null;
    throw new ErroApi('http', 401, 'Não foi possível entrar com o Google. Tente de novo.');
  }
}
