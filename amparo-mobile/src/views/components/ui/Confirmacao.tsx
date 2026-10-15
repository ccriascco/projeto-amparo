import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTema } from '@/views/theme/tema';
import { fixas, raios } from '@/views/theme/tokens';

import { Botao } from './Botao';
import { Texto } from './Texto';

// Confirmação de ações sem volta, no mesmo sheet do design (véu vinho e cantos de 32 px).
type Props = {
  visivel: boolean;
  titulo: string;
  texto: string;
  rotuloConfirmar: string;
  aoConfirmar: () => void;
  aoFechar: () => void;
  carregando?: boolean;
  erro?: string | null;
  children?: ReactNode;
};

export function Confirmacao({ visivel, titulo, texto, rotuloConfirmar, aoConfirmar, aoFechar, carregando, erro, children }: Props) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={aoFechar}
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: fixas.overlay }}
        />
        <View
          accessibilityViewIsModal
          style={{ padding: 32, paddingBottom: 32 + insets.bottom, borderTopLeftRadius: raios.sheet, borderTopRightRadius: raios.sheet, backgroundColor: cores.card, gap: 12 }}
        >
          <Texto variante="secao" accessibilityRole="header">
            {titulo}
          </Texto>
          <Texto variante="cardCorpo" style={{ lineHeight: 21 }}>
            {texto}
          </Texto>
          {children}
          {erro ? (
            <Texto variante="nota" corLivre={fixas.sos} accessibilityLiveRegion="polite">
              {erro}
            </Texto>
          ) : null}
          <View style={{ gap: 8, marginTop: 8 }}>
            <Botao variante="perigo" onPress={aoConfirmar} carregando={carregando}>
              {rotuloConfirmar}
            </Botao>
            <Botao variante="secundario" onPress={aoFechar} desabilitado={carregando}>
              Cancelar
            </Botao>
          </View>
        </View>
      </View>
    </Modal>
  );
}
