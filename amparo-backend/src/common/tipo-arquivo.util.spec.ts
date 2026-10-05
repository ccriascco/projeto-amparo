import { conteudoCorrespondeAoMime } from './tipo-arquivo.util';

describe('conteudoCorrespondeAoMime', () => {
  it('aceita JPEG real', () => {
    expect(conteudoCorrespondeAoMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]), 'image/jpeg')).toBe(true);
  });

  it('recusa executável (MZ) declarado como JPEG', () => {
    expect(conteudoCorrespondeAoMime(Buffer.from('MZ\x90\x00\x03\x00\x00\x00', 'binary'), 'image/jpeg')).toBe(false);
  });

  it('aceita PNG real e recusa PNG falso', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    expect(conteudoCorrespondeAoMime(png, 'image/png')).toBe(true);
    expect(conteudoCorrespondeAoMime(Buffer.from('<script>alert(1)</script>'), 'image/png')).toBe(false);
  });

  it('aceita MP4 (ftyp na posição 4)', () => {
    expect(conteudoCorrespondeAoMime(Buffer.from('0000000066747970', 'hex'), 'video/mp4')).toBe(true);
  });

  it('recusa mimetype sem assinatura conhecida', () => {
    expect(conteudoCorrespondeAoMime(Buffer.from('abc'), 'application/x-msdownload')).toBe(false);
  });

  it('aceita MP3 com ID3 e recusa arquivo vazio', () => {
    expect(conteudoCorrespondeAoMime(Buffer.from('ID3\x04\x00', 'binary'), 'audio/mpeg')).toBe(true);
    expect(conteudoCorrespondeAoMime(Buffer.alloc(0), 'audio/mpeg')).toBe(false);
  });
});
