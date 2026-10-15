import { LinearGradient } from 'expo-linear-gradient';
import { type ReactElement, type ReactNode, useRef, useState } from 'react';
import { type RefreshControlProps, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { irParaAba, useAcoesCabecalho, useUsuariaCabecalho } from '@/controllers/cabecalho';
import { useTema } from '@/views/theme/tema';
import { layout } from '@/views/theme/tokens';

import { AppHeader, type AppHeaderProps } from './AppHeader';
import { type Aba, AppNav } from './AppNav';

// Casca das telas internas: AppHeader em gradiente, conteúdo rolável com margens de 32 px,
// degradê no rodapé e a nav flutuante (que fica compacta enquanto a tela rola).
type Props = {
  aba?: Aba;
  cabecalho: AppHeaderProps;
  children: ReactNode;
  semNav?: boolean;
  gap?: number;
  paddingTopo?: number;
  sobreposicao?: ReactNode;
  controleAtualizar?: ReactElement<RefreshControlProps>;
};

export function TelaInterna({ aba, cabecalho, children, semNav = false, gap = 24, paddingTopo = 24, sobreposicao, controleAtualizar }: Props) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const acoesCabecalho = useAcoesCabecalho();
  const usuaria = useUsuariaCabecalho();
  const [compacto, setCompacto] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aoRolar = () => {
    if (!compacto) setCompacto(true);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setCompacto(false), 600);
  };

  return (
    <View style={{ flex: 1, backgroundColor: cores.tela }}>
      <AppHeader {...acoesCabecalho} iniciais={usuaria.iniciais} nome={usuaria.nome} {...cabecalho} />
      <ScrollView
        onScroll={aoRolar}
        scrollEventThrottle={64}
        keyboardShouldPersistTaps="handled"
        refreshControl={controleAtualizar}
        contentContainerStyle={{
          paddingTop: paddingTopo,
          paddingHorizontal: layout.margemTela,
          paddingBottom: semNav ? 32 + insets.bottom : layout.respiroNav + insets.bottom,
          gap,
          width: '100%',
          maxWidth: layout.larguraMaxima,
          alignSelf: 'center',
          flexGrow: 1,
        }}
      >
        {children}
      </ScrollView>
      {semNav || !aba ? null : (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={[`${cores.tela}00`, cores.tela]}
            locations={[0, 0.55]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 + insets.bottom }}
          />
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 24 + insets.bottom, alignItems: 'center' }}>
            <AppNav ativo={aba} compacto={compacto} aoTrocar={irParaAba} />
          </View>
        </>
      )}
      {sobreposicao}
    </View>
  );
}
