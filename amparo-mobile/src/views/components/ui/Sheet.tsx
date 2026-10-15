import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTema } from '@/views/theme/tema';
import { fixas, raios } from '@/views/theme/tokens';

import { Botao } from './Botao';
import { Texto } from './Texto';

// Bottom sheet do design: véu vinho-profundo 45%, painel com cantos de 32 px.
// Tocar fora fecha, como no protótipo.
type Props = {
  visivel: boolean;
  aoFechar: () => void;
  titulo?: string;
  texto?: string;
  rotuloFechar?: string;
  children?: ReactNode;
};

export function Sheet({ visivel, aoFechar, titulo, texto, rotuloFechar = 'Entendi', children }: Props) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={aoFechar}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: fixas.overlay }}
        />
        <View
          accessibilityViewIsModal
          style={{
            padding: 32,
            paddingBottom: 32 + insets.bottom,
            borderTopLeftRadius: raios.sheet,
            borderTopRightRadius: raios.sheet,
            backgroundColor: cores.card,
            gap: 12,
          }}
        >
          {titulo ? (
            <Texto variante="secao" accessibilityRole="header">
              {titulo}
            </Texto>
          ) : null}
          {texto ? (
            <Texto variante="cardCorpo" style={{ lineHeight: 21 }}>
              {texto}
            </Texto>
          ) : null}
          {children}
          <Botao variante="secundario" onPress={aoFechar} estilo={{ marginTop: 8 }}>
            {rotuloFechar}
          </Botao>
        </View>
      </View>
    </Modal>
  );
}
