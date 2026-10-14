import { type ReactNode, useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, View } from 'react-native';

import { layout } from '@/theme/tokens';

import { Pontos } from './Basicos';

// Faixa horizontal que vaza até a borda da tela (margin -32), com 3 pontos de página
// como no protótipo (ações rápidas, guias, FAQ).
type Props = { children: ReactNode; gap?: number; larguraAtiva?: number; rotulo: string };

export function Carrossel({ children, gap = 16, larguraAtiva = 18, rotulo }: Props) {
  const ref = useRef<ScrollView>(null);
  const [pagina, setPagina] = useState(0);
  const [conteudo, setConteudo] = useState(0);
  const [visivel, setVisivel] = useState(0);
  const maximo = Math.max(0, conteudo - visivel);

  const aoRolar = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const max = contentSize.width - layoutMeasurement.width;
    const p = max > 0 ? Math.round((contentOffset.x / max) * 2) : 0;
    if (p !== pagina) setPagina(p);
  };

  const irPara = (i: number) => {
    setPagina(i);
    ref.current?.scrollTo({ x: (maximo * i) / 2, animated: true });
  };

  return (
    <View style={{ gap: 12, marginHorizontal: -layout.margemTela }}>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={aoRolar}
        onContentSizeChange={(w) => setConteudo(w)}
        onLayout={(e) => setVisivel(e.nativeEvent.layout.width)}
        scrollEventThrottle={32}
        accessibilityLabel={rotulo}
        contentContainerStyle={{ gap, paddingHorizontal: layout.margemTela, paddingVertical: 4 }}
      >
        {children}
      </ScrollView>
      <Pontos total={3} ativo={pagina} larguraAtiva={larguraAtiva} aoTocar={irPara} />
    </View>
  );
}
