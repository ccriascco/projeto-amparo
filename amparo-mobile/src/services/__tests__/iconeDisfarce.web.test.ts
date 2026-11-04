/**
 * @jest-environment jsdom
 */
import { aplicarIconeDisfarce } from '@/services/iconeDisfarce.web';

jest.mock('expo-asset', () => ({ Asset: { fromModule: () => ({ uri: 'http://localhost/favicon-calc.png' }) } }));

const icone = () => document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
const proximoCiclo = () => new Promise((r) => setTimeout(r, 0));

describe('aplicarIconeDisfarce (web)', () => {
  it('desligado e nunca trocado: não mexe na aba', async () => {
    document.head.innerHTML = '<title>Amparo</title>';
    await aplicarIconeDisfarce(false);
    expect(document.title).toBe('Amparo');
    expect(icone()).toBeNull(); // o navegador continua usando o /favicon.ico sozinho
  });

  it('página sem <link> de ícone: liga com a calculadora e, ao desligar, volta a ficar sem link', async () => {
    document.head.innerHTML = '<title>Amparo</title>';
    await aplicarIconeDisfarce(true);
    expect(document.title).toBe('Calc');
    expect(icone()?.href).toBe('http://localhost/favicon-calc.png');

    document.title = 'Amparo'; // algo tenta trocar o título com o disfarce ligado
    await proximoCiclo();
    expect(document.title).toBe('Calc');

    await aplicarIconeDisfarce(false);
    expect(document.title).toBe('Amparo');
    expect(icone()).toBeNull();
    document.title = 'Outro';
    await proximoCiclo();
    expect(document.title).toBe('Outro');
  });

  it('página com <link> de ícone: ao desligar, devolve o ícone original', async () => {
    document.head.innerHTML = '<title>Amparo</title><link rel="icon" href="/favicon.ico">';
    await aplicarIconeDisfarce(true);
    expect(icone()?.href).toBe('http://localhost/favicon-calc.png');
    await aplicarIconeDisfarce(false);
    expect(icone()?.getAttribute('href')).toBe('/favicon.ico');
    expect(document.title).toBe('Amparo');
  });
});
