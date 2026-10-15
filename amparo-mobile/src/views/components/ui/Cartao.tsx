import type { ReactNode } from 'react';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';

import { useTema } from '@/views/theme/tema';
import { raios } from '@/views/theme/tokens';

import { Icone, type NomeIcone } from './Icone';
import { Texto } from './Texto';

// Receita de card do design: fundo de superfície, borda vinho 10%, raio 12, sombra de papel fino.
type CartaoProps = {
  children: ReactNode;
  onPress?: () => void;
  estilo?: StyleProp<ViewStyle>;
  borda?: string;
  fundo?: string;
  rotuloAcessivel?: string;
  testID?: string;
};

export function Cartao({ children, onPress, estilo, borda, fundo, rotuloAcessivel, testID }: CartaoProps) {
  const { cores, sombraCard } = useTema();
  const base: ViewStyle = {
    padding: 24,
    borderWidth: 1,
    borderColor: borda ?? cores.borda10,
    borderRadius: raios.card,
    backgroundColor: fundo ?? cores.card,
    ...sombraCard,
  };
  if (!onPress) {
    return (
      <View testID={testID} style={[base, estilo]}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel}
      style={({ pressed }) => [base, pressed && { borderColor: cores.borda20, opacity: 0.92 }, estilo]}
    >
      {children}
    </Pressable>
  );
}

// Círculo com ícone em vinho sobre vinho 10% (40 px nos cards, 64/72 px em destaques)
export function CirculoIcone({
  nome,
  tamanho = 40,
  tamanhoIcone,
  cor,
  fundo,
}: {
  nome: NomeIcone;
  tamanho?: number;
  tamanhoIcone?: number;
  cor?: string;
  fundo?: string;
}) {
  const { cores } = useTema();
  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: raios.pilula,
        backgroundColor: fundo ?? cores.borda10,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icone nome={nome} tamanho={tamanhoIcone ?? Math.round(tamanho * 0.6)} cor={cor ?? cores.acento} />
    </View>
  );
}

// Card informativo: círculo de ícone + título + corpo (+ link opcional)
export function CartaoInfo({
  icone,
  titulo,
  corpo,
  link,
  onPress,
  borda,
  corIcone,
  fundoIcone,
  children,
}: {
  icone: NomeIcone;
  titulo: string;
  corpo?: string;
  link?: string;
  onPress?: () => void;
  borda?: string;
  corIcone?: string;
  fundoIcone?: string;
  children?: ReactNode;
}) {
  return (
    <Cartao onPress={onPress} borda={borda} estilo={{ gap: 12 }} rotuloAcessivel={titulo}>
      <CirculoIcone nome={icone} cor={corIcone} fundo={fundoIcone} />
      <View style={{ gap: 4 }}>
        <Texto variante="cardTitulo">{titulo}</Texto>
        {corpo ? <Texto variante="cardCorpo">{corpo}</Texto> : null}
        {link ? <Texto variante="link">{link}</Texto> : null}
      </View>
      {children}
    </Cartao>
  );
}
