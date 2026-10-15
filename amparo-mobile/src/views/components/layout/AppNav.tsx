import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTema } from '@/views/theme/tema';
import { raios } from '@/views/theme/tokens';

// AppNav do protótipo: pílula flutuante com 4 ícones próprios.
// Ativo: círculo de 40 px com fundo vinho 10%, ícone 24 px. Inativo: 28 px, 50% de opacidade.
// "compacto" aproxima os itens enquanto a tela rola.
export type Aba = 'inicio' | 'documentacao' | 'rede' | 'mais';

const ITENS: { id: Aba; rotulo: string; path: string }[] = [
  {
    id: 'inicio',
    rotulo: 'Início',
    path: 'M12 3.1 2.5 11.4c-.4.3-.1 1 .4 1H5v7.9c0 .4.3.7.7.7h3.6c.4 0 .7-.3.7-.7v-4.1h4v4.1c0 .4.3.7.7.7h3.6c.4 0 .7-.3.7-.7v-7.9h2.1c.5 0 .8-.7.4-1L12 3.1Z',
  },
  {
    id: 'documentacao',
    rotulo: 'Ocorrências',
    path: 'M13.5 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5L13.5 2Zm.5 6V3.8L18.2 8H14ZM8.6 12.6h6.8v1.6H8.6v-1.6Zm0 3.4h4.8v1.6H8.6V16Z',
  },
  {
    id: 'rede',
    rotulo: 'Rede de apoio',
    path: 'M12 2 4 4.9v6.3c0 5 3.4 9.3 8 10.6 4.6-1.3 8-5.6 8-10.6V4.9L12 2Zm.9 6.6v2.2h2.2v1.8h-2.2v2.2h-1.8v-2.2H8.9v-1.8h2.2V8.6h1.8Z',
  },
  {
    id: 'mais',
    rotulo: 'Mais',
    path: 'M12 11.6a4.3 4.3 0 1 0 0-8.6 4.3 4.3 0 0 0 0 8.6Zm0 1.8c-4.1 0-7.4 2.1-7.4 4.7V21h14.8v-2.9c0-2.6-3.3-4.7-7.4-4.7Z',
  },
];

type Props = { ativo: Aba; compacto?: boolean; aoTrocar: (aba: Aba) => void };

export function AppNav({ ativo, compacto = false, aoTrocar }: Props) {
  const { cores, sombraCard } = useTema();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: compacto ? 14 : 22,
        height: 56,
        paddingVertical: 8,
        paddingHorizontal: compacto ? 20 : 30,
        borderRadius: raios.pilula,
        backgroundColor: cores.card,
        borderWidth: 0.5,
        borderColor: cores.borda10,
        ...(sombraCard.boxShadow ? { boxShadow: '2px 2px 8px rgba(0,0,0,0.04)' } : {}),
      }}
    >
      {ITENS.map((item) => {
        const on = item.id === ativo;
        const caixa = on ? 40 : 28;
        const icone = on ? 24 : 28;
        return (
          <Pressable
            key={item.id}
            onPress={() => aoTrocar(item.id)}
            accessibilityRole="tab"
            accessibilityLabel={item.rotulo}
            accessibilityState={{ selected: on }}
            hitSlop={8}
            style={{
              width: caixa,
              height: caixa,
              borderRadius: raios.pilula,
              backgroundColor: on ? cores.borda10 : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Svg width={icone} height={icone} viewBox="0 0 24 24" opacity={on ? 1 : 0.5}>
              <Path d={item.path} fill={cores.acento} />
            </Svg>
          </Pressable>
        );
      })}
    </View>
  );
}
