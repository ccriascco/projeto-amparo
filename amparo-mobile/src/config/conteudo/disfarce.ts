import { Platform } from 'react-native';

// Textos do Modo Disfarce que dependem do sistema: no Android o ícone e o nome mudam ("Calc");
// no iPhone só o ícone muda, e o próprio iOS avisa a troca citando o nome do app;
// no navegador mudam o ícone e o título da aba.
const noIphone = Platform.OS === 'ios';
const naWeb = Platform.OS === 'web';

export const RESUMO_DISFARCE = noIphone
  ? 'O ícone vira uma calculadora e o app abre como uma calculadora comum.'
  : naWeb
    ? 'A aba do navegador passa a se chamar "Calc", com ícone de calculadora, e o app abre como uma calculadora comum.'
    : 'O app passa a se chamar "Calc", com ícone de calculadora, e abre como uma calculadora comum.';

export const CONFIRMAR_DISFARCE = {
  titulo: 'Ligar o Modo Disfarce?',
  texto: noIphone
    ? 'O ícone do app vira uma calculadora e ele abre como uma calculadora que funciona de verdade. O nome embaixo do ícone continua "Amparo", e o iPhone mostra um aviso do sistema sobre a troca do ícone.'
    : naWeb
      ? 'A aba do navegador passa a mostrar "Calc", com ícone de calculadora, e o app abre como uma calculadora que funciona de verdade. Favoritos e atalhos que você já salvou continuam com o nome antigo.'
      : 'Quando você sair do app, ele passa a aparecer como "Calc", com ícone de calculadora, na lista de apps. Ao abrir, ele é uma calculadora que funciona de verdade. Se o atalho estava na sua tela inicial, coloque o novo pela lista de apps.',
  rotuloConfirmar: 'Ligar o disfarce',
};
