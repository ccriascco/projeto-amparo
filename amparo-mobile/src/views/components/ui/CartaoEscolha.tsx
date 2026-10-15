import { Pressable, View } from 'react-native';

import { useTema } from '@/views/theme/tema';
import { raios } from '@/views/theme/tokens';

import { Texto } from './Texto';

// Card com rádio (etapa 7 do cadastro: Ativar Modo Disfarce / Manter Modo Padrão)
export function CartaoEscolha({
  titulo,
  corpo,
  selecionado,
  onPress,
}: {
  titulo: string;
  corpo: string;
  selecionado: boolean;
  onPress: () => void;
}) {
  const { cores, sombraCard } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selecionado }}
      accessibilityLabel={`${titulo}. ${corpo}`}
      style={{
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
        padding: 24,
        borderWidth: 1,
        borderColor: selecionado ? cores.acento : cores.borda10,
        borderRadius: raios.card,
        backgroundColor: selecionado ? cores.borda04 : cores.card,
        ...sombraCard,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: cores.acento,
          marginTop: 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: selecionado ? cores.acento : 'transparent' }} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Texto variante="cardTitulo">{titulo}</Texto>
        <Texto variante="cardCorpo">{corpo}</Texto>
      </View>
    </Pressable>
  );
}
