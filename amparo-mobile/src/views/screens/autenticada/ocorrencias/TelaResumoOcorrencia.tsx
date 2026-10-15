import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ErroApi, MENSAGEM_CARREGAR, mensagemDeErro } from '@/services/api/erros';
import type { Evidencia, NivelRisco, TipoEvidencia } from '@/models/tipos';
import { TelaInterna } from '@/views/components/layout/TelaInterna';
import { Botao } from '@/views/components/ui/Botao';
import { Confirmacao } from '@/views/components/ui/Confirmacao';
import { Carregando, ErroCarregar } from '@/views/components/ui/Estados';
import { Icone, type NomeIcone } from '@/views/components/ui/Icone';
import { Texto } from '@/views/components/ui/Texto';
import { ICONE_VIOLENCIA } from '@/config/conteudo/violencia';
import { useOcorrencia, useRemoverOcorrencia } from '@/controllers/dados';
import { useTema } from '@/views/theme/tema';
import { fixas, raios } from '@/views/theme/tokens';
import { diaMes, diaMesDeData, diaMesHora, hora } from '@/utils/datas';
import { useTelaPrivada } from '@/controllers/privacidade';

const ROTULO_RISCO: Record<NivelRisco, string> = { Baixo: 'baixo', Medio: 'médio', Alto: 'alto' };
const MIDIA: Record<TipoEvidencia, { rotulo: string; icone: NomeIcone }> = {
  IMAGE: { rotulo: 'Foto', icone: 'image' },
  VIDEO: { rotulo: 'Vídeo', icone: 'play' },
  AUDIO: { rotulo: 'Áudio', icone: 'play' },
  DOCUMENTO: { rotulo: 'Documento', icone: 'file-text' },
};

export default function TelaResumoOcorrencia() {
  useTelaPrivada();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cores, sombraCard } = useTema();
  const ocorrencia = useOcorrencia(id);
  const remover = useRemoverOcorrencia();
  const [confirmando, setConfirmando] = useState(false);

  const o = ocorrencia.data;
  const abrirEvidencia = (e: Evidencia, n: number) =>
    router.push({ pathname: '/ocorrencias/evidencia', params: { ocorrenciaId: id, evidenciaId: e.id, titulo: `${MIDIA[e.tipo].rotulo} ${n}` } });

  const contagem: Record<string, number> = {};
  const numerar = (e: Evidencia) => (contagem[e.tipo] = (contagem[e.tipo] ?? 0) + 1);

  return (
    <TelaInterna
      aba="documentacao"
      cabecalho={{ titulo: 'Resumo da ocorrência', sub: 'Detalhes do que você registrou.', aoFecharTopo: () => router.back() }}
      gap={32}
      paddingTopo={32}
      sobreposicao={
        <Confirmacao
          visivel={confirmando}
          titulo="Apagar esta ocorrência?"
          texto="O registro e os arquivos anexados saem do seu cofre e não têm como ser recuperados depois."
          rotuloConfirmar="Apagar ocorrência"
          carregando={remover.isPending}
          erro={remover.isError ? (remover.error instanceof ErroApi ? remover.error.mensagem : 'Não foi possível apagar.') : null}
          aoFechar={() => {
            setConfirmando(false);
            remover.reset();
          }}
          aoConfirmar={() => remover.mutate(id, { onSuccess: () => router.navigate('/ocorrencias') })}
        />
      }
    >
      {ocorrencia.isLoading ? <Carregando /> : null}
      {ocorrencia.isError ? <ErroCarregar mensagem={mensagemDeErro(ocorrencia.error, MENSAGEM_CARREGAR)} aoTentar={() => ocorrencia.refetch()} /> : null}
      {o ? (
        <>
          <View style={{ gap: 12 }}>
            <Texto variante="secao" accessibilityRole="header">
              Tipo de violência
            </Texto>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {o.tipos_violencia.map((t) => (
                <View
                  key={t}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    minHeight: 40,
                    paddingVertical: 10,
                    paddingHorizontal: 18,
                    borderRadius: raios.pilula,
                    borderWidth: 1,
                    borderColor: cores.acento,
                    backgroundColor: cores.borda10,
                  }}
                >
                  <Icone nome={ICONE_VIOLENCIA[t] ?? 'circle'} tamanho={18} cor={cores.acento} />
                  <Texto peso={700} tamanho={14} cor="acento">
                    {t}
                  </Texto>
                </View>
              ))}
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <Texto variante="secao" accessibilityRole="header">
              O que você contou
            </Texto>
            <Texto variante="subtitulo" style={{ lineHeight: 26 }}>
              {o.mensagem?.trim() ? o.mensagem : 'Você não escreveu um relato neste registro.'}
            </Texto>
          </View>

          {o.evidencias && o.evidencias.length > 0 ? (
            <View style={{ gap: 12 }}>
              <Texto variante="secao" accessibilityRole="header">
                Mídias anexadas
              </Texto>
              {o.evidencias.map((e) => {
                const n = numerar(e);
                const m = MIDIA[e.tipo] ?? MIDIA.DOCUMENTO;
                const escuro = e.tipo === 'VIDEO';
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => abrirEvidencia(e, n)}
                    accessibilityRole="button"
                    accessibilityLabel={`${m.rotulo} ${n}. Abrir e verificar.`}
                    style={{
                      height: e.tipo === 'IMAGE' || escuro ? 200 : undefined,
                      flexDirection: e.tipo === 'IMAGE' || escuro ? 'column' : 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: e.tipo === 'IMAGE' || escuro ? 8 : 16,
                      padding: 20,
                      borderRadius: raios.card,
                      borderWidth: 1,
                      borderColor: cores.borda10,
                      backgroundColor: escuro ? fixas.midiaFundo : e.tipo === 'IMAGE' ? cores.borda04 : cores.card,
                      ...(e.tipo === 'IMAGE' || escuro ? {} : sombraCard),
                    }}
                  >
                    {escuro ? (
                      <View style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                        <Icone nome="play" tamanho={28} cor="#FFFFFF" />
                      </View>
                    ) : e.tipo === 'AUDIO' ? (
                      <View style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: cores.acento, alignItems: 'center', justifyContent: 'center' }}>
                        <Icone nome="play" tamanho={22} cor="#FFFFFF" />
                      </View>
                    ) : (
                      <Icone nome={m.icone} tamanho={32} cor={cores.acento} />
                    )}
                    <View style={{ alignItems: e.tipo === 'IMAGE' || escuro ? 'center' : 'flex-start', gap: 2, flex: e.tipo === 'IMAGE' || escuro ? undefined : 1 }}>
                      <Texto peso={600} tamanho={14} corLivre={escuro ? '#FFFFFF' : cores.textoSuave}>
                        {`${m.rotulo} ${n}`}
                      </Texto>
                      <Texto variante="nota" corLivre={escuro ? 'rgba(255,255,255,0.75)' : undefined}>
                        Toque para abrir e verificar a integridade
                      </Texto>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Texto variante="nota">Esse registro tem só o relato escrito, sem arquivos anexados.</Texto>
          )}

          <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: cores.borda10, paddingTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icone nome="calendar" tamanho={20} cor={cores.acento} />
                <Texto cor="acento">{o.data_ocorrencia ? diaMesDeData(o.data_ocorrencia) : diaMes(o.criado_em)}</Texto>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icone nome="clock" tamanho={20} cor={cores.acento} />
                <Texto cor="acento">{hora(o.criado_em)}</Texto>
              </View>
            </View>
            {o.nivel_risco ? <Texto variante="nota">{`Leitura de risco deste registro: ${ROTULO_RISCO[o.nivel_risco]}.`}</Texto> : null}
            {o.atualizado_em ? <Texto variante="nota">{`Editado em ${diaMesHora(o.atualizado_em)}.`}</Texto> : null}
          </View>

          <View style={{ gap: 8 }}>
            <Botao variante="secundario" onPress={() => router.push({ pathname: '/ocorrencias/nova', params: { id } })}>
              Editar ocorrência
            </Botao>
            <Botao variante="perigo" onPress={() => setConfirmando(true)}>
              Apagar ocorrência
            </Botao>
          </View>
        </>
      ) : null}
    </TelaInterna>
  );
}
