import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fixas } from '@/theme/tokens';

import {
  CALC_INICIAL,
  digitar,
  type EstadoCalc,
  igual,
  inverter,
  limpar,
  operar,
  type Operacao,
  porcento,
  virgula,
} from './logicaCalculadora';

// Tela da calculadora do Modo Disfarce (cópia fiel da calculadora do iPhone no protótipo).
const { calculadora: C } = fixas;
const CINZA = { fundo: C.cinza, cor: '#000000' };
const LARANJA = { fundo: C.laranja, cor: '#FFFFFF' };
const ESCURO = { fundo: C.escuro, cor: '#FFFFFF' };

type Tecla = { rotulo: string; estilo: { fundo: string; cor: string }; acao: (c: EstadoCalc) => EstadoCalc | 'igual'; largo?: boolean; nome?: string };

const TECLAS: Tecla[][] = [
  [
    { rotulo: 'AC', estilo: CINZA, acao: limpar, nome: 'Limpar' },
    { rotulo: '+/−', estilo: CINZA, acao: inverter, nome: 'Inverter sinal' },
    { rotulo: '%', estilo: CINZA, acao: porcento, nome: 'Porcentagem' },
    { rotulo: '÷', estilo: LARANJA, acao: (c) => operar(c, '÷'), nome: 'Dividir' },
  ],
  linha(['7', '8', '9'], '×', 'Multiplicar'),
  linha(['4', '5', '6'], '−', 'Subtrair'),
  linha(['1', '2', '3'], '+', 'Somar'),
  [
    { rotulo: '0', estilo: ESCURO, acao: (c) => digitar(c, '0'), largo: true },
    { rotulo: ',', estilo: ESCURO, acao: virgula, nome: 'Vírgula' },
    { rotulo: '=', estilo: LARANJA, acao: () => 'igual', nome: 'Igual' },
  ],
];

function linha(digitos: string[], op: Operacao, nome: string): Tecla[] {
  return [
    ...digitos.map((d) => ({ rotulo: d, estilo: ESCURO, acao: (c: EstadoCalc) => digitar(c, d) })),
    { rotulo: op, estilo: LARANJA, acao: (c: EstadoCalc) => operar(c, op), nome },
  ];
}

type Props = {
  /** Chamada quando a pessoa digita 4 números e "="; devolve true se destravou */
  aoTentarCodigo?: (codigo: string) => void;
  /** Versão miniatura e sem toque (capa de privacidade / multitarefas) */
  estatica?: boolean;
};

export function Calculadora({ aoTentarCodigo, estatica = false }: Props) {
  const [estado, setEstado] = useState<EstadoCalc>(CALC_INICIAL);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const larguraUtil = Math.min(width, 520) - 24;
  const lado = (larguraUtil - 3 * 12) / 4;
  const altura = Math.min(76, lado);

  const tocar = (t: Tecla) => {
    const r = t.acao(estado);
    if (r === 'igual') {
      const { estado: novo, codigoCandidato } = igual(estado);
      setEstado(novo);
      if (codigoCandidato) aoTentarCodigo?.(codigoCandidato);
      return;
    }
    setEstado(r);
  };

  const tamanhoVisor = estado.visor.length > 7 ? 56 : 76;

  return (
    <View
      style={{ flex: 1, backgroundColor: C.fundo, justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 24 + insets.bottom, gap: 12 }}
      pointerEvents={estatica ? 'none' : 'auto'}
    >
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, alignItems: 'flex-end', alignSelf: 'center', width: larguraUtil }}>
        <Text
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ fontSize: tamanhoVisor, fontWeight: '300', color: '#FFFFFF', letterSpacing: -1, lineHeight: tamanhoVisor * 1.05 }}
        >
          {estado.visor}
        </Text>
      </View>
      <View style={{ gap: 12, alignSelf: 'center', width: larguraUtil }}>
        {TECLAS.map((fileira, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
            {fileira.map((t) => (
              <Pressable
                key={t.rotulo}
                onPress={() => tocar(t)}
                accessibilityRole="button"
                accessibilityLabel={t.nome ?? t.rotulo}
                style={({ pressed }) => ({
                  width: t.largo ? lado * 2 + 12 : lado,
                  height: altura,
                  borderRadius: 999,
                  backgroundColor: t.estilo.fundo,
                  opacity: pressed ? 0.7 : 1,
                  alignItems: t.largo ? 'flex-start' : 'center',
                  justifyContent: 'center',
                  paddingLeft: t.largo ? 28 : 0,
                })}
              >
                <Text style={{ fontSize: 32, color: t.estilo.cor }}>{t.rotulo}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
