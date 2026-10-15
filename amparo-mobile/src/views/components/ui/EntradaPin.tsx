import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { useTema } from '@/views/theme/tema';
import { fontes, raios } from '@/views/theme/tokens';

import { Texto } from './Texto';

// Código de 4 dígitos: quatro casas visíveis e um campo numérico invisível por cima,
// como no protótipo (etapa 7 do cadastro e "Alterar código").
type Props = {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  erro?: boolean;
  aoFocar?: () => void;
  autoFocus?: boolean;
  testID?: string;
};

export function EntradaPin({ rotulo, valor, aoMudar, erro = false, aoFocar, autoFocus, testID }: Props) {
  const { cores } = useTema();
  const [foco, setFoco] = useState(false);

  return (
    <View style={{ gap: 8 }}>
      <Texto peso={700} tamanho={16} corLivre={foco ? cores.acento : cores.textoSuave}>
        {rotulo}
      </Texto>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {Array.from({ length: 4 }, (_, i) => {
          const atual = foco && valor.length === i;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: 56,
                borderRadius: raios.casaPin,
                borderWidth: 1,
                borderColor: erro ? cores.sair : atual ? cores.acento : cores.borda40,
                backgroundColor: cores.card,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Texto style={{ fontFamily: fontes.core[700], fontSize: 22, lineHeight: 26 }}>{valor[i] ? '•' : ''}</Texto>
            </View>
          );
        })}
        <TextInput
          testID={testID}
          value={valor}
          onChangeText={(t) => aoMudar(t.replace(/\D/g, '').slice(0, 4))}
          onFocus={() => {
            setFoco(true);
            aoFocar?.();
          }}
          onBlur={() => setFoco(false)}
          autoFocus={autoFocus}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          caretHidden
          accessibilityLabel={rotulo}
          accessibilityValue={{ text: `${valor.length} de 4 dígitos` }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, color: 'transparent', opacity: 0.02 }}
        />
      </View>
    </View>
  );
}
