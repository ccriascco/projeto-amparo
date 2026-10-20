import { Pressable, View } from 'react-native';

import type { NivelRisco } from '@/models/tipos';
import { Cartao, CirculoIcone } from '@/views/components/ui/Cartao';
import { Texto } from '@/views/components/ui/Texto';
import { useTema } from '@/views/theme/tema';
import { fixas, raios } from '@/views/theme/tokens';
import { diaMes } from '@/utils/datas';

const NIVEIS: { id: NivelRisco; rotulo: string }[] = [
  { id: 'Baixo', rotulo: 'Baixo' },
  { id: 'Medio', rotulo: 'Médio' },
  { id: 'Alto', rotulo: 'Alto' },
];

type Props = {
  nivel: NivelRisco | null;
  atualizadaEm: string | null;
  carregando: boolean;
  erro: boolean;
  aoTentar: () => void;
  aoExplicar: () => void;
};

// "Leitura de risco · IA": o nível calculado pela IA numa escala Baixo · Médio · Alto,
// com a data da última atualização. Fica logo abaixo do SOS, no Início.
export function CartaoLeituraRisco({ nivel, atualizadaEm, carregando, erro, aoTentar, aoExplicar }: Props) {
  const { cores } = useTema();
  const corDo: Record<NivelRisco, string> = { Baixo: cores.verde, Medio: cores.acento, Alto: fixas.sos };
  const rotulo = NIVEIS.find((n) => n.id === nivel)?.rotulo;

  const nota = carregando
    ? 'Carregando sua leitura…'
    : erro
      ? 'Não foi possível carregar sua leitura. Toque para tentar de novo.'
      : !nivel
        ? 'A primeira leitura aparece depois do seu primeiro registro de ocorrência.'
        : atualizadaEm
          ? `Atualizada em ${diaMes(atualizadaEm)}, depois do seu último registro.`
          : 'Atualizada depois do seu último registro.';

  const resumo = `Leitura de risco da IA: ${rotulo ?? 'ainda sem leitura'}. ${nota}`;

  return (
    <Cartao onPress={erro ? aoTentar : undefined} rotuloAcessivel={resumo} estilo={{ gap: 16 }}>
      {/* Para leitores de tela, o título, a escala e a data são lidos como uma frase só */}
      <View accessible accessibilityLabel={resumo} style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <CirculoIcone nome="shield-check" />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Texto variante="cardTitulo">Leitura de risco</Texto>
            <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: raios.pilula, backgroundColor: cores.borda10 }}>
              <Texto peso={700} tamanho={12} cor="acento" style={{ letterSpacing: -0.24, lineHeight: 16 }}>
                IA
              </Texto>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {NIVEIS.map((n) => {
            const ativo = n.id === nivel && !carregando && !erro;
            return (
              <View key={n.id} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
                <Texto peso={ativo ? 700 : 500} tamanho={14} corLivre={ativo ? corDo[n.id] : cores.nota}>
                  {ativo ? n.rotulo.toUpperCase() : n.rotulo}
                </Texto>
                <View style={{ alignSelf: 'stretch', height: ativo ? 8 : 4, borderRadius: raios.pilula, backgroundColor: ativo ? corDo[n.id] : cores.borda10 }} />
              </View>
            );
          })}
        </View>

        <Texto variante="cardCorpo">{nota}</Texto>
      </View>

      {nivel && !carregando && !erro ? (
        <Pressable onPress={aoExplicar} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-start' }}>
          <Texto variante="link">Como a IA calcula →</Texto>
        </Pressable>
      ) : null}
    </Cartao>
  );
}
