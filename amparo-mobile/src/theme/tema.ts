import { useColorScheme } from 'react-native';

import { usePreferencias } from '@/store/preferencias';

import { cores, type Cores, type NomeTema } from './tokens';

export type Tema = {
  nome: NomeTema;
  cores: Cores;
  // Sombra de "papel fino" dos cards; o tema escuro não usa sombra
  sombraCard: { boxShadow?: string };
};

export function useTema(): Tema {
  const escolha = usePreferencias((p) => p.tema);
  const sistema = useColorScheme();
  const nome: NomeTema = escolha === 'auto' ? (sistema === 'dark' ? 'escuro' : 'claro') : escolha;
  const c = cores[nome];
  return {
    nome,
    cores: c,
    sombraCard: c.sombraCard ? { boxShadow: '2px 2px 4px rgba(0,0,0,0.04)' } : {},
  };
}
