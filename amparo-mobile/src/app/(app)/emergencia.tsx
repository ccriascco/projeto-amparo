import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiEmergencias } from '@/api/endpoints';
import { ErroApi } from '@/api/erros';
import { Botao } from '@/components/ui/Botao';
import { Cartao, CartaoInfo } from '@/components/ui/Cartao';
import { Carregando } from '@/components/ui/Estados';
import { Icone } from '@/components/ui/Icone';
import { Texto } from '@/components/ui/Texto';
import { chaves, useEmergencia } from '@/hooks/dados';
import { useTema } from '@/theme/tema';
import { fixas, raios } from '@/theme/tokens';
import { hora } from '@/utils/datas';

// "Alerta enviado": confirmação, prévia do mapa, quem foi avisada (atualiza a cada 10 s)
// e "Cancelar aviso" (encerra a emergência).
export default function TelaEmergencia() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cores, sombraCard } = useTema();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const situacao = useEmergencia(id);

  const encerrar = useMutation({
    mutationFn: () => apiEmergencias.encerrar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chaves.emergenciaAtiva });
      qc.invalidateQueries({ queryKey: chaves.perfil });
      router.navigate('/');
    },
  });

  const avisos = situacao.data?.avisos ?? [];
  const encerrada = situacao.data?.emergencia?.status === 'ENCERRADA';

  return (
    <View style={{ flex: 1, backgroundColor: cores.tela }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: Math.max(insets.top + 16, 48), paddingHorizontal: 32, paddingBottom: 48 + insets.bottom, gap: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Pressable
            onPress={() => router.navigate('/')}
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
        ) : avisos.length === 0 && situacao.isSuccess ? (
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
          {situacao.isLoading ? <Carregando rotulo="Carregando…" /> : null}
          {situacao.isError ? (
            <Texto variante="cardCorpo">{situacao.error instanceof ErroApi ? situacao.error.mensagem : 'Não foi possível atualizar agora.'}</Texto>
          ) : null}
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

        {encerrar.isError ? (
          <Texto variante="nota" corLivre={fixas.sos} centro>
            {encerrar.error instanceof ErroApi ? encerrar.error.mensagem : 'Não foi possível cancelar o aviso.'}
          </Texto>
        ) : null}
        <View style={{ marginTop: 'auto' }}>
          {encerrada ? (
            <Botao variante="secundario" onPress={() => router.navigate('/')}>
              Voltar ao Início
            </Botao>
          ) : (
            <Botao variante="secundario" onPress={() => encerrar.mutate()} carregando={encerrar.isPending}>
              Cancelar aviso
            </Botao>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
