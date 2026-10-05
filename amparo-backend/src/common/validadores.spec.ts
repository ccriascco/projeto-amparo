import { motivoSenhaFraca } from './validadores';

describe('motivoSenhaFraca', () => {
  it.each(['Amparo2026Seguro', 'casa9rua7azul', 'Tr3s-Ventos'])('aceita %p', (senha) => {
    expect(motivoSenhaFraca(senha)).toBeNull();
  });

  it.each([
    ['12345678', 'letras e números'],
    ['abcdefgh', 'letras e números'],
    ['aaaaaaa1', null],
    ['senha123', 'muito comum'],
    ['SENHA1234', 'muito comum'],
  ])('avalia %p', (senha, trecho) => {
    const motivo = motivoSenhaFraca(senha);
    if (trecho === null) expect(motivo).toBeNull();
    else expect(motivo).toContain(trecho);
  });

  it('caractere repetido (11111111) é recusado por não ter letras', () => {
    expect(motivoSenhaFraca('11111111')).toContain('letras e números');
  });

  it('uma sequência mista de letras e números (a1b2c3d4) não é considerada sequência', () => {
    expect(motivoSenhaFraca('a1b2c3d4')).toBeNull();
  });
});
