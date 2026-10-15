import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

// "Prova verificada": o app baixa o arquivo pelo link temporário, calcula o SHA-256
// no próprio aparelho e compara com o hash gravado pelo backend no momento do envio.
// Só mostra "verificada" se os dois forem iguais.

export function hexDe(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256DeBytes(bytes: Uint8Array): Promise<string> {
  return hexDe(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes as unknown as BufferSource));
}

/** Formato do design: "a3f9c2e7 · 8b41d05a · 6ec73912" (os 24 primeiros caracteres) */
export function hashResumido(hash: string): string {
  return (hash.slice(0, 24).match(/.{1,8}/g) ?? []).join(' · ');
}

export type ArquivoVerificado = { uri: string; confere: boolean; hashCalculado: string };

/** Baixa para o cache do app (nunca para a galeria) e confere o hash */
export async function baixarEConferir(url: string, hashEsperado: string, nome: string): Promise<ArquivoVerificado> {
  const pasta = new Directory(Paths.cache, 'evidencias');
  if (!pasta.exists) pasta.create({ intermediates: true });
  const destino = new File(pasta, nome);
  if (destino.exists) destino.delete();
  const arquivo = await File.downloadFileAsync(url, destino, { idempotent: true });
  const hashCalculado = await sha256DeBytes(await arquivo.bytes());
  return { uri: arquivo.uri, confere: hashCalculado === hashEsperado.toLowerCase(), hashCalculado };
}

/** Apaga as cópias baixadas (ao sair da tela da prova) */
export function limparCacheEvidencias() {
  try {
    const pasta = new Directory(Paths.cache, 'evidencias');
    if (pasta.exists) pasta.delete();
  } catch {
    // o sistema limpa o cache sozinho se falhar aqui
  }
}
