import { Pressable, View } from 'react-native';

import { Chevron } from '@/components/ui/Basicos';
import { Icone } from '@/components/ui/Icone';
import { Texto } from '@/components/ui/Texto';
import { useTema } from '@/theme/tema';

// ScreenTitle do protótipo: voltar (chevron) ou fechar (X) em vinho, título 25 px e subtítulo.
type Props = { titulo: string; sub?: string; tipo?: 'voltar' | 'sair'; acao?: () => void };

export function ScreenTitle({ titulo, sub, tipo = 'voltar', acao }: Props) {
  const { cores } = useTema();
  return (
    <View style={{ gap: 8 }}>
      {acao ? (
        <Pressable
          onPress={acao}
          accessibilityRole="button"
          accessibilityLabel={tipo === 'sair' ? 'Fechar' : 'Voltar'}
          style={{ alignSelf: 'flex-start', width: 44, height: 44, marginLeft: -10, alignItems: 'center', justifyContent: 'center' }}
        >
          {tipo === 'sair' ? <Icone nome="x" tamanho={24} cor={cores.acento} /> : <Chevron cor={cores.acento} largura={11} altura={20} />}
        </Pressable>
      ) : null}
      <Texto variante="tituloMedio" accessibilityRole="header">
        {titulo}
      </Texto>
      {sub ? <Texto variante="cardCorpo">{sub}</Texto> : null}
    </View>
  );
}
