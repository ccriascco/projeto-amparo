import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// No celular tudo fica no SecureStore (Keychain / Keystore).
// A versão web só existe para conferir as telas no navegador durante o desenvolvimento:
// lá usamos sessionStorage, que é apagado ao fechar a aba.
const naWeb = Platform.OS === 'web';

export async function ler(chave: string): Promise<string | null> {
  if (naWeb) return globalThis.sessionStorage?.getItem(chave) ?? null;
  return SecureStore.getItemAsync(chave);
}

export async function gravar(chave: string, valor: string): Promise<void> {
  if (naWeb) {
    globalThis.sessionStorage?.setItem(chave, valor);
    return;
  }
  await SecureStore.setItemAsync(chave, valor);
}

export async function apagar(chave: string): Promise<void> {
  if (naWeb) {
    globalThis.sessionStorage?.removeItem(chave);
    return;
  }
  await SecureStore.deleteItemAsync(chave);
}
