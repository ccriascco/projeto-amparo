import { createHash } from 'crypto';

import { hashResumido, hexDe } from '@/services/integridade';

describe('integridade da prova', () => {
  it('converte o digest em hexadecimal igual ao do backend (sha256 hex)', () => {
    const conteudo = Buffer.from('%PDF-1.4 teste');
    const esperado = createHash('sha256').update(conteudo).digest('hex');
    const digest = createHash('sha256').update(conteudo).digest();
    expect(hexDe(digest.buffer.slice(digest.byteOffset, digest.byteOffset + digest.byteLength))).toBe(esperado);
  });

  it('resume o hash no formato do design', () => {
    expect(hashResumido('a3f9c2e78b41d05a6ec73912ffffffff')).toBe('a3f9c2e7 · 8b41d05a · 6ec73912');
  });
});
