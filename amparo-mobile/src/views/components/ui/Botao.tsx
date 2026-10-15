import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { useTema } from '@/views/theme/tema';
import { fontes, raios, tamanhos } from '@/views/theme/tokens';

import { Texto } from './Texto';

// Button do design system: primary (vinho cheio), secondary (contorno 1,5 px),
// perigo (contorno suave com texto avermelhado, usado em "Sair da conta" e "Remover guardião")
type Variante = 'primario' | 'secundario' | 'perigo';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  variante?: Variante;
  desabilitado?: boolean;
  carregando?: boolean;
  icone?: ReactNode;
  compacto?: boolean;
  estilo?: StyleProp<ViewStyle>;
  rotuloAcessivel?: string;
  testID?: string;
};

export function Botao({
  children,
  onPress,
  variante = 'primario',
  desabilitado = false,
  carregando = false,
  icone,
  compacto = false,
  estilo,
  rotuloAcessivel,
  testID,
}: Props) {
  const { cores } = useTema();
  const inativo = desabilitado || carregando;

  const pintar = (pressionado: boolean) => {
    if (variante === 'secundario') {
      const borda = desabilitado ? cores.textoSecundario : pressionado ? cores.acentoPressionado : cores.acento;
      return {
        fundo: pressionado ? cores.borda08 : 'transparent',
        borda,
        texto: desabilitado ? cores.textoDesabilitado : borda,
        larguraBorda: 1.5,
      };
    }
    if (variante === 'perigo') {
      return { fundo: pressionado ? cores.borda08 : 'transparent', borda: cores.borda20, texto: cores.sair, larguraBorda: 1 };
    }
    return {
      fundo: desabilitado ? cores.fundoDesabilitado : pressionado ? cores.acentoPressionado : cores.acento,
      borda: 'transparent',
      texto: desabilitado ? cores.textoDesabilitado : '#FFFFFF',
      larguraBorda: 1.5,
    };
  };

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel}
      accessibilityState={{ disabled: inativo, busy: carregando }}
      style={({ pressed }) => {
        const p = pintar(pressed && !inativo);
        return [
          {
            minHeight: compacto ? 36 : 48,
            paddingVertical: compacto ? 8 : 12,
            paddingHorizontal: compacto ? 16 : 24,
            borderRadius: raios.pilula,
            backgroundColor: p.fundo,
            borderColor: p.borda,
            borderWidth: p.larguraBorda,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transform: [{ scale: pressed && !inativo ? 0.98 : 1 }],
          },
          estilo,
        ];
      }}
    >
      {({ pressed }) => {
        const p = pintar(pressed && !inativo);
        return (
          <>
            {carregando ? <ActivityIndicator color={p.texto} /> : icone}
            <Texto
              corLivre={p.texto}
              style={{ fontFamily: fontes.core[700], fontSize: compacto ? tamanhos.cardCorpo : tamanhos.corpo, lineHeight: compacto ? 16 : 18 }}
            >
              {children}
            </Texto>
          </>
        );
      }}
    </Pressable>
  );
}
