import { mascararTelefone } from './mascara.util';

describe('mascararTelefone', () => {
  it('mantém só os 4 últimos dígitos', () => {
    expect(mascararTelefone('11987650001')).toBe('*******0001');
    expect(mascararTelefone('(11) 98765-0001')).toBe('*******0001');
  });

  it('não expõe números curtos ou ausentes', () => {
    expect(mascararTelefone('123')).toBe('****');
    expect(mascararTelefone(null)).toBe('****');
  });
});
