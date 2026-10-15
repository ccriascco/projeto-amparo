const ASSINATURAS: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) => b.length >= 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
  'video/mp4': (b) => b.length >= 8 && b.subarray(4, 8).toString('ascii') === 'ftyp',
  'video/quicktime': (b) => b.length >= 8 && b.subarray(4, 8).toString('ascii') === 'ftyp',
  'video/webm': (b) => b.length >= 4 && b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
  'audio/mp4': (b) => b.length >= 8 && b.subarray(4, 8).toString('ascii') === 'ftyp',
  'audio/x-m4a': (b) => b.length >= 8 && b.subarray(4, 8).toString('ascii') === 'ftyp',
  'audio/mpeg': (b) => b.length >= 3 && (b.subarray(0, 3).toString('ascii') === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)),
  'audio/wav': (b) => b.length >= 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WAVE',
  'audio/ogg': (b) => b.length >= 4 && b.subarray(0, 4).toString('ascii') === 'OggS',
  'application/pdf': (b) => b.length >= 5 && b.subarray(0, 5).toString('ascii') === '%PDF-',
};

export const TIPOS_ARQUIVO_PERMITIDOS = Object.keys(ASSINATURAS);

export function conteudoCorrespondeAoMime(buffer: Buffer, mimetype: string): boolean {
  const verificar = ASSINATURAS[mimetype];
  return verificar ? verificar(buffer) : false;
}
