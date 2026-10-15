import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { MENSAGEM_CARREGAR, mensagemDeErro } from '@/services/api/erros';
import type { Guardia } from '@/models/tipos';
import { TelaInterna } from '@/views/components/layout/TelaInterna';
import { Botao } from '@/views/components/ui/Botao';
import { Cartao, CirculoIcone } from '@/views/components/ui/Cartao';
import { Carrossel } from '@/views/components/ui/Carrossel';
import { Carregando, ErroCarregar, Vazio } from '@/views/components/ui/Estados';
import { Sheet } from '@/views/components/ui/Sheet';
import { Texto } from '@/views/components/ui/Texto';
import { FAQ_REDE, POR_QUE_REDE } from '@/config/conteudo/textos';
import { useGuardioes } from '@/controllers/dados';
import { useTema } from '@/views/theme/tema';
import { raios } from '@/views/theme/tokens';
import { haQuantoTempo } from '@/utils/tempoRelativo';

const MAXIMO = 5;

function atividade(g: Guardia) {
  if (g.status_convite === 'CONFIRMADO' && g.confirmado_em) return `Confirmou ${haQuantoTempo(g.confirmado_em)}`;
  return g.convidado_em ? `Convite enviado ${haQuantoTempo(g.convidado_em)}` : 'Convite pendente';
}

export default function TelaRede() {
  const { cores } = useTema();
  const guardioes = useGuardioes();
  const [info, setInfo] = useState<{ titulo: string; texto: string } | null>(null);

  // Confirmadas primeiro, depois as que ainda não aceitaram (ordem do protótipo)
  const lista = [...(guardioes.data ?? [])].sort((a, b) => Number(b.status_convite === 'CONFIRMADO') - Number(a.status_convite === 'CONFIRMADO'));
  const cheia = lista.length >= MAXIMO;

  return (
    <TelaInterna
      aba="rede"
      cabecalho={{ titulo: 'Rede de apoio', sub: 'Pessoas de confiança que podem ser avisadas em situações de risco.' }}
      controleAtualizar={<RefreshControl refreshing={guardioes.isRefetching} onRefresh={() => guardioes.refetch()} tintColor={cores.acento} />}
      sobreposicao={<Sheet visivel={!!info} aoFechar={() => setInfo(null)} titulo={info?.titulo} texto={info?.texto} />}
    >
      <View style={{ gap: 12 }}>
        {guardioes.isLoading ? <Carregando rotulo="Carregando sua rede…" /> : null}
        {guardioes.isError ? <ErroCarregar mensagem={mensagemDeErro(guardioes.error, MENSAGEM_CARREGAR)} aoTentar={() => guardioes.refetch()} /> : null}
        {guardioes.isSuccess && lista.length === 0 ? (
          <Vazio icone="users-round" titulo="Nenhuma guardiã ainda" texto="Adicione pelo menos uma pessoa de confiança." />
        ) : null}
        {lista.map((g) => {
          const ok = g.status_convite === 'CONFIRMADO';
          return (
            <Cartao
              key={g.id}
              onPress={() => router.push({ pathname: '/rede/guardia', params: { id: g.id } })}
              rotuloAcessivel={`${g.nome_completo}, ${g.parentesco_relacao ?? 'sem relação definida'}, ${ok ? 'confirmou o convite' : 'convite pendente'}. Editar.`}
              estilo={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 20 }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Texto variante="cardTitulo">{g.nome_completo}</Texto>
                {g.parentesco_relacao ? (
                  <Texto peso={700} tamanho={14} cor="acento">
                    {g.parentesco_relacao}
                  </Texto>
                ) : null}
                <Texto variante="cardCorpo">{atividade(g)}</Texto>
              </View>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: raios.pilula,
                  backgroundColor: ok ? 'rgba(46,125,107,0.12)' : cores.borda10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  {ok ? (
                    <Path d="M9.6 16.2 5.4 12l-1.4 1.4 5.6 5.6L20.4 7.8 19 6.4Z" fill="#2E7D6B" />
                  ) : (
                    <Path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm.9 10.4-.4.3-3.6 2.1-.9-1.5 3.1-1.8V6h1.8v6.4Z" fill="rgba(149,75,110,0.75)" />
                  )}
                </Svg>
              </View>
            </Cartao>
          );
        })}
      </View>

      {cheia ? (
        <View style={{ gap: 8 }}>
          <Botao variante="secundario" desabilitado>
            Adicionar guardião
          </Botao>
          <Texto variante="nota">Você já tem 5 guardiões. Remova um para abrir espaço.</Texto>
        </View>
      ) : (
        <Botao onPress={() => router.push('/rede/guardia')} desabilitado={!guardioes.isSuccess}>
          Adicionar guardião
        </Botao>
      )}

      <Carrossel rotulo="Dúvidas sobre a rede">
        {FAQ_REDE.map((f) => (
          <Pressable
            key={f.rotulo}
            onPress={() => setInfo({ titulo: f.rotulo, texto: f.texto })}
            accessibilityRole="button"
            accessibilityLabel={f.rotulo}
            style={{ width: 84, alignItems: 'center', gap: 8 }}
          >
            <CirculoIcone nome={f.icone} tamanho={72} tamanhoIcone={26} />
            <Texto peso={600} tamanho={12} cor="textoSuave" centro style={{ lineHeight: 14 }}>
              {f.rotulo}
            </Texto>
          </Pressable>
        ))}
      </Carrossel>

      <Cartao onPress={() => setInfo(POR_QUE_REDE)} borda={cores.borda12} estilo={{ gap: 8 }} rotuloAcessivel="Por que ter uma rede importa. Saiba mais.">
        <CirculoIcone nome="heart-handshake" />
        <View style={{ gap: 4 }}>
          <Texto peso={600} tamanho={18} style={{ lineHeight: 22 }}>
            Por que ter uma rede importa
          </Texto>
          <Texto variante="cardCorpo">Quem já sabe o que fazer chega mais rápido.</Texto>
          <Texto variante="link">Saiba mais</Texto>
        </View>
      </Cartao>
    </TelaInterna>
  );
}
