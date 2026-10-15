import { type Ref, useState } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';

import { useTema } from '@/views/theme/tema';
import { fixas, fontes, raios, tamanhos } from '@/views/theme/tokens';

import { Texto } from './Texto';

// Input do design system: rótulo vinho em negrito, campo em pílula,
// borda vinho 40% → vinho no foco → vermelho SOS no erro, mensagem de erro ou nota abaixo.
type Props = Omit<TextInputProps, 'style'> & {
  rotulo?: string;
  erro?: string | null;
  nota?: string;
  desabilitado?: boolean;
  ref?: Ref<TextInput>;
};

export function Campo({ rotulo, erro, nota, desabilitado = false, ref, onFocus, onBlur, ...resto }: Props) {
  const { cores } = useTema();
  const [foco, setFoco] = useState(false);
  const borda = erro ? fixas.sos : foco ? cores.acento : desabilitado ? cores.borda20 : cores.borda40;

  return (
    <View style={{ gap: 8, width: '100%' }}>
      {rotulo ? <Texto variante="rotulo">{rotulo}</Texto> : null}
      <TextInput
        ref={ref}
        {...resto}
        editable={!desabilitado}
        accessibilityLabel={resto.accessibilityLabel ?? rotulo}
        accessibilityHint={erro ?? undefined}
        placeholderTextColor={cores.textoPlaceholder}
        onFocus={(e) => {
          setFoco(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFoco(false);
          onBlur?.(e);
        }}
        style={{
          fontFamily: fontes.core[400],
          fontSize: tamanhos.corpo,
          color: cores.texto,
          backgroundColor: desabilitado ? cores.borda04 : cores.card,
          borderWidth: 1,
          borderColor: borda,
          borderRadius: raios.pilula,
          paddingVertical: 12,
          paddingHorizontal: 24,
          minHeight: 48,
        }}
      />
      {erro ? (
        <Texto variante="nota" corLivre={fixas.sos} style={{ paddingLeft: 16 }} accessibilityLiveRegion="polite">
          {erro}
        </Texto>
      ) : nota ? (
        <Texto variante="nota" style={{ paddingLeft: 16 }}>
          {nota}
        </Texto>
      ) : null}
    </View>
  );
}
