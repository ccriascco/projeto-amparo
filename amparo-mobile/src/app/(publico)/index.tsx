import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pontos } from '@/components/ui/Basicos';
import { Botao } from '@/components/ui/Botao';
import { Texto } from '@/components/ui/Texto';
import { SLIDES } from '@/conteudo/textos';
import { useTema } from '@/theme/tema';
import { fontes, raios } from '@/theme/tokens';

// Carrossel de boas-vindas: foto ocupa ~70% da tela, painel branco sobe por cima com
// bolinhas, título, subtítulo e os botões Criar Conta / Já tenho Conta.
export default function TelaAbertura() {
  const { cores } = useTema();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [slide, setSlide] = useState(0);
  const rolagem = useRef<ScrollView>(null);
  const alturaFoto = Math.round(height * 0.7);
  const topoPainel = Math.round(height * 0.673);

  const irPara = (i: number) => {
    const alvo = Math.max(0, Math.min(SLIDES.length - 1, i));
    setSlide(alvo);
    rolagem.current?.scrollTo({ x: alvo * width, animated: true });
  };

  const aoRolar = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== slide) setSlide(i);
  };

  const atual = SLIDES[slide];

  return (
    <View style={{ flex: 1, backgroundColor: cores.tela }}>
      <ScrollView
        ref={rolagem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={aoRolar}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: alturaFoto }}
        accessibilityLabel="Imagens de boas-vindas"
      >
        {SLIDES.map((s, i) => (
          <Image key={i} source={s.foto} contentFit="cover" contentPosition="top" style={{ width, height: alturaFoto }} accessible={false} />
        ))}
      </ScrollView>

      {/* Toque na lateral direita da foto avança, como no protótipo */}
      <Pressable
        onPress={() => irPara(slide + 1)}
        accessibilityRole="button"
        accessibilityLabel="Próxima imagem"
        style={{ position: 'absolute', right: 0, top: 0, width: 140, height: topoPainel - 18 }}
      />

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          top: topoPainel,
          borderTopLeftRadius: raios.sheet,
          borderTopRightRadius: raios.sheet,
          backgroundColor: cores.tela,
          boxShadow: '0 -8px 16px rgba(0,0,0,0.1)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 32,
          paddingBottom: 32 + insets.bottom,
        }}
      >
        <View style={{ width: Math.min(337, width - 64), gap: 16 }}>
          <Pontos total={SLIDES.length} ativo={slide} larguraAtiva={32} tamanho={8} aoTocar={irPara} corInativa="rgba(149,75,110,0.25)" />
          <View style={{ gap: 4 }}>
            <Texto
              accessibilityRole="header"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ fontFamily: fontes.display[700], fontSize: 25, lineHeight: 30 }}
            >
              {atual.titulo}
            </Texto>
            <Texto variante="subtitulo">{atual.sub}</Texto>
          </View>
          <View style={{ gap: 8 }}>
            <Botao onPress={() => router.push('/cadastro')}>Criar Conta</Botao>
            <Botao variante="secundario" onPress={() => router.push('/login')}>
              Já tenho Conta
            </Botao>
          </View>
        </View>
      </View>
    </View>
  );
}
