import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { type ReactElement, type ReactNode, useRef, useState } from 'react';
import { type RefreshControlProps, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiUsuarias } from '@/api/endpoints';
import type { Perfil } from '@/api/tipos';
import { chaves } from '@/hooks/dados';
import { useSessao } from '@/store/sessao';
import { useTema } from '@/theme/tema';
import { layout } from '@/theme/tokens';

import { AppHeader, type AppHeaderProps } from './AppHeader';
import { type Aba, AppNav } from './AppNav';

// Casca das telas internas: AppHeader em gradiente, conteúdo rolável com margens de 32 px,
// degradê no rodapé e a nav flutuante (que fica compacta enquanto a tela rola).
export const ROTA_DA_ABA: Record<Aba, '/' | '/ocorrencias' | '/rede' | '/mais'> = {
  inicio: '/',
  documentacao: '/ocorrencias',
  rede: '/rede',
  mais: '/mais',
};

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

export function irParaAba(aba: Aba) {
  router.navigate(ROTA_DA_ABA[aba]);
}

/**
 * Atalhos do cabeçalho: sino → Rede, calculadora → esconde o app na calculadora
 * (precisa de um código de 4 números definido), engrenagem → Mais.
 */
export function useAcoesCabecalho() {
  const qc = useQueryClient();
  return {
    aoNotificacoes: () => router.navigate('/rede'),
    aoCalculadora: async () => {
      const perfil =
        qc.getQueryData<Perfil>(chaves.perfil) ??
        (await qc.fetchQuery({ queryKey: chaves.perfil, queryFn: apiUsuarias.perfil }).catch(() => null));
      if (perfil?.codigo_disfarce_definido || useSessao.getState().usuaria?.modo_disfarcado) useSessao.getState().travar();
      else router.navigate({ pathname: '/mais/codigo', params: { motivo: 'calculadora' } });
    },
    aoConfiguracoes: () => router.navigate('/mais'),
  };
}

export function TelaInterna({ aba, cabecalho, children, semNav = false, gap = 24, paddingTopo = 24, sobreposicao, controleAtualizar }: Props) {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const acoesCabecalho = useAcoesCabecalho();
  const [compacto, setCompacto] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aoRolar = () => {
    if (!compacto) setCompacto(true);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setCompacto(false), 600);
  };

  return (
    <View style={{ flex: 1, backgroundColor: cores.tela }}>
      <AppHeader {...acoesCabecalho} {...cabecalho} />
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
