import { Image } from 'expo-image';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTelaEmergencia } from '@/controllers/telas/autenticada/useTelaEmergencia';
import { Botao } from '@/views/components/ui/Botao';
import { Cartao, CartaoInfo } from '@/views/components/ui/Cartao';
import { Carregando } from '@/views/components/ui/Estados';
import { Icone } from '@/views/components/ui/Icone';
import { Texto } from '@/views/components/ui/Texto';
import { useTema } from '@/views/theme/tema';
import { fixas, raios } from '@/views/theme/tokens';
import { hora } from '@/utils/datas';

// "Alerta enviado": confirmação, prévia do mapa, quem foi avisada (atualiza a cada 10 s)
// e "Cancelar aviso" (encerra a emergência).
export default function TelaEmergencia() {
  const { avisos, encerrada, ...c } = useTelaEmergencia();
  const { cores, sombraCard } = useTema();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: cores.tela }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: Math.max(insets.top + 16, 48), paddingHorizontal: 32, paddingBottom: 48 + insets.bottom, gap: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Pressable
            onPress={c.irParaInicio}
            accessibilityRole="button"
            accessibilityLabel="Sair rápido. O pedido de ajuda continua ativo."
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 16, borderRadius: raios.pilula, borderWidth: 1, borderColor: cores.borda20 }}
          >
            <Icone nome="x" tamanho={16} cor={cores.nota} />
            <Texto peso={700} tamanho={14} cor="nota">
              Sair rápido
            </Texto>
          </Pressable>
        </View>

        {encerrada ? (
          <CartaoInfo icone="check" titulo="Aviso encerrado" corpo="Este pedido de ajuda já foi encerrado." />
        ) : avisos.length === 0 && c.carregou ? (
          <CartaoInfo
            icone="triangle-alert"
            titulo="Ninguém foi avisada"
            corpo="Você ainda não tem guardiãs cadastradas. Se puder, ligue 190."
            corIcone={fixas.sos}
            fundoIcone="rgba(198,40,40,0.10)"
          />
        ) : (
          <CartaoInfo
            icone="check"
            titulo="Alerta enviado"
            corpo="Sua localização foi compartilhada com sua rede de guardiãs. Aguardando confirmação."
            borda={cores.verde30}
            corIcone={cores.verde}
            fundoIcone={cores.verde12}
          />
        )}

        <View style={{ height: 180, borderRadius: 20, overflow: 'hidden', ...sombraCard }}>
          <Image source={require('@/assets/images/mapa-previa.png')} contentFit="cover" style={{ width: '100%', height: '100%' }} accessibilityLabel="Prévia do mapa com sua localização" />
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Icone nome="map-pin" tamanho={32} cor={cores.acento} />
          </View>
        </View>

        <Cartao estilo={{ gap: 12 }}>
          <Texto variante="cardTitulo">Quem foi avisada</Texto>
          {c.carregando ? <Carregando rotulo="Carregando…" /> : null}
          {c.erroSituacao !== null ? <Texto variante="cardCorpo">{c.erroSituacao}</Texto> : null}
          <View style={{ gap: 12 }} accessibilityLiveRegion="polite">
            {avisos.map((a, i) => (
              <View key={`${a.guardiao_id ?? 'g'}-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <Texto variante="cardCorpo" style={{ flex: 1 }}>
                  {a.nome_completo}
                </Texto>
                {a.status === 'CONFIRMADO' && a.confirmado_em ? (
                  <Texto peso={700} tamanho={14} corLivre={cores.verde}>{`Confirmou · ${hora(a.confirmado_em)}`}</Texto>
                ) : (
                  <Texto tamanho={14} cor="textoSecundario">
                    Aguardando
                  </Texto>
                )}
              </View>
            ))}
          </View>
        </Cartao>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Icone nome="refresh-cw" tamanho={20} cor={cores.nota} />
          <Texto variante="nota" style={{ flex: 1 }}>
            Sua localização é reenviada a cada 30 s enquanto o aviso estiver ativo.
          </Texto>
        </View>

        {c.erroCancelar !== null ? (
          <Texto variante="nota" corLivre={fixas.sos} centro>
            {c.erroCancelar}
          </Texto>
        ) : null}
        <View style={{ marginTop: 'auto' }}>
          {encerrada ? (
            <Botao variante="secundario" onPress={c.irParaInicio}>
              Voltar ao Início
            </Botao>
          ) : (
            <Botao variante="secundario" onPress={c.cancelarAviso} carregando={c.cancelando}>
              Cancelar aviso
            </Botao>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
