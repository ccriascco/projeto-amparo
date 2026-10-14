import * as Crypto from 'expo-crypto';

import { apagar, gravar, ler } from './armazenamento';

// Hash do código do disfarce guardado no aparelho. Serve só para uma situação:
// a sessão foi encerrada (ex.: 5 códigos errados) com o disfarce ligado. O app continua
// parecendo uma calculadora e, com o código certo, abre a tela de login — sem revelar o app
// para quem estiver tentando adivinhar. Ele não dá acesso a nenhum dado.
const CHAVE = 'amparo.codigo_local';

async function resumo(codigo: string, sal: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${sal}:${codigo}`);
}

export async function guardarCodigoLocal(codigo: string): Promise<void> {
  const sal = Crypto.randomUUID();
  await gravar(CHAVE, `${sal}.${await resumo(codigo, sal)}`);
}

export async function conferirCodigoLocal(codigo: string): Promise<boolean> {
  const guardado = await ler(CHAVE);
  if (!guardado) return false;
  const [sal, hash] = guardado.split('.');
  return (await resumo(codigo, sal)) === hash;
}

export async function temCodigoLocal(): Promise<boolean> {
  return !!(await ler(CHAVE));
}

export async function apagarCodigoLocal(): Promise<void> {
  await apagar(CHAVE);
}
