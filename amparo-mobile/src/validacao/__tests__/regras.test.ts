import {
  cpfValido,
  dataParaIso,
  emailValido,
  isoParaData,
  mascararCpf,
  mascararData,
  mascararTelefone,
  senhaAtendeRegras,
  telefoneValido,
} from '@/validacao/regras';

describe('validações (iguais às do backend)', () => {
  it.each(['529.982.247-25', '52998224725', '123.456.789-09'])('CPF válido %p', (c) => expect(cpfValido(c)).toBe(true));
  it.each(['111.111.111-11', '123.456.789-10', '1234567890', ''])('CPF inválido %p', (c) => expect(cpfValido(c)).toBe(false));

  it('máscaras', () => {
    expect(mascararCpf('52998224725')).toBe('529.982.247-25');
    expect(mascararCpf('5299')).toBe('529.9');
    expect(mascararTelefone('11984721130')).toBe('(11) 98472-1130');
    expect(mascararTelefone('1133334444')).toBe('(11) 3333-4444');
    expect(mascararData('14031991')).toBe('14/03/1991');
  });

  it('datas', () => {
    expect(dataParaIso('14/03/1991')).toBe('1991-03-14');
    expect(dataParaIso('31/02/2000')).toBeNull();
    expect(dataParaIso('1/2/2000')).toBeNull();
    expect(isoParaData('1991-03-14')).toBe('14/03/1991');
  });

  it('telefone e e-mail', () => {
    expect(telefoneValido('(11) 98472-1130')).toBe(true);
    expect(telefoneValido('(11) 9847')).toBe(false);
    expect(emailValido('ana@amparo.com')).toBe(true);
    expect(emailValido('marina@exemplo')).toBe(false);
  });

  it.each([
    ['Amparo#2026', true],
    ['amparo#2026', false],
    ['Amparo2026', false],
    ['Amparo#Seg', false],
    ['Am#1', false],
  ])('senha %p atende ao checklist: %p', (s, ok) => expect(senhaAtendeRegras(s)).toBe(ok));
});
