import { motivoSenhaFraca, REGEX_CODIGO_DISFARCE } from './validadores';

describe('motivoSenhaFraca (8+ caracteres, maiúscula, número e caractere especial)', () => {
  it.each(['Amparo#2026', 'Casa9-rua7', 'Tr3s-Ventos', 'Lua!Cheia42'])('aceita %p', (senha) => {
    expect(motivoSenhaFraca(senha)).toBeNull();
  });

  it.each([
    ['Ab1!', 'no mínimo 8 caracteres'],
    ['amparo#2026', 'letra maiúscula'],
    ['Amparo#Seguro', 'número'],
    ['Amparo2026', 'caractere especial'],
    ['Senha@123', 'muito comum'],
    ['P@ssw0rd', 'muito comum'],
  ])('recusa %p (%s)', (senha, trecho) => {
    expect(motivoSenhaFraca(senha)).toContain(trecho);
  });

  it('letras acentuadas contam como letras, não como caractere especial', () => {
    expect(motivoSenhaFraca('Coração2026')).toContain('caractere especial');
    expect(motivoSenhaFraca('Coração#2026')).toBeNull();
  });

  it('recusa valores que não são texto', () => {
    expect(motivoSenhaFraca(12345678)).toBe('a senha precisa ser um texto');
  });
});

describe('código do Modo Disfarce', () => {
  it.each(['0000', '1207', '9999'])('aceita %p', (c) => expect(REGEX_CODIGO_DISFARCE.test(c)).toBe(true));
  it.each(['123', '12345', '12a4', ' 1234', ''])('recusa %p', (c) => expect(REGEX_CODIGO_DISFARCE.test(c)).toBe(false));
});
