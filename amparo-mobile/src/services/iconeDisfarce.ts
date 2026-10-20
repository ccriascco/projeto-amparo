import { getAppIconName, setAlternateAppIcon, supportsAlternateIcons } from 'expo-alternate-app-icons';

// Ícone (e, no Android, o nome "Calc") do Modo Disfarce. O ícone alternativo e o nome são
// configurados no app.json (expo-alternate-app-icons + plugins/nome-icone-disfarce).
const ICONE_DISFARCE = 'Calc';

/** Deixa o ícone do app de acordo com o Modo Disfarce. Não faz nada se já estiver certo. */
export async function aplicarIconeDisfarce(ligado: boolean): Promise<void> {
  if (!supportsAlternateIcons) return;
  const alvo = ligado ? ICONE_DISFARCE : null;
  try {
    if (getAppIconName() === alvo) return;
    await setAlternateAppIcon(alvo);
  } catch {
    // Sem ícone alternativo o disfarce continua funcionando: o app abre como calculadora
  }
}
