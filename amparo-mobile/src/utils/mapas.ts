import { Linking, Platform } from 'react-native';

import { localizacaoAtual } from './permissoes';

// "Delegacias próximas": abre o app de mapas do celular buscando a Delegacia da Mulher
// perto de onde ela está. Nenhum dado de delegacia é inventado pelo app.
export async function abrirDelegaciasProximas() {
  const termo = encodeURIComponent('Delegacia da Mulher');
  const local = await localizacaoAtual();
  const url =
    Platform.OS === 'ios'
      ? `https://maps.apple.com/?q=${termo}${local ? `&sll=${local.latitude},${local.longitude}` : ''}`
      : `https://www.google.com/maps/search/?api=1&query=${termo}${local ? `&center=${local.latitude},${local.longitude}` : ''}`;
  await Linking.openURL(url);
}

export function ligar(numero: string) {
  Linking.openURL(`tel:${numero}`);
}
