import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { apiOcorrencias } from '@/services/api/endpoints';
import { ErroApi } from '@/services/api/erros';
import { PlayerAudio, PlayerVideo } from '@/views/components/dominio/Players';
import { ScreenTitle } from '@/views/components/layout/ScreenTitle';
import { TelaInterna } from '@/views/components/layout/TelaInterna';
import { Botao } from '@/views/components/ui/Botao';
import { Cartao, CartaoInfo, CirculoIcone } from '@/views/components/ui/Cartao';
import { Carregando, ErroCarregar } from '@/views/components/ui/Estados';
import { Icone } from '@/views/components/ui/Icone';
import { Texto } from '@/views/components/ui/Texto';
import { useOcorrencia } from '@/controllers/dados';
import { useTema } from '@/views/theme/tema';
import { fixas, raios } from '@/views/theme/tokens';
import { diaMesHora } from '@/utils/datas';
import { baixarEConferir, hashResumido, limparCacheEvidencias } from '@/services/integridade';
import { useTelaPrivada } from '@/controllers/privacidade';

const EXTENSAO = { IMAGE: 'jpg', VIDEO: 'mp4', AUDIO: 'm4a', DOCUMENTO: 'pdf' } as const;

// "Detalhe da prova": abre o arquivo e mostra se ele é o mesmo que foi guardado.
export default function TelaEvidencia() {
  useTelaPrivada();
  const { ocorrenciaId, evidenciaId, titulo } = useLocalSearchParams<{ ocorrenciaId: string; evidenciaId: string; titulo?: string }>();
  const { cores } = useTema();
  const ocorrencia = useOcorrencia(ocorrenciaId);
  const evidencia = ocorrencia.data?.evidencias?.find((e) => e.id === evidenciaId);
  const [telaCheia, setTelaCheia] = useState(false);

  // Link temporário (5 min) + download para o cache do app + conferência do SHA-256
  const arquivo = useQuery({
    queryKey: ['evidencia', evidenciaId],
    queryFn: async () => {
      const link = await apiOcorrencias.linkEvidencia(ocorrenciaId, evidenciaId);
      const verificado = await baixarEConferir(link.url, link.hash_integridade, `${evidenciaId}.${EXTENSAO[link.tipo]}`);
      return { ...verificado, link };
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  useEffect(() => () => limparCacheEvidencias(), []);

  const dados = arquivo.data;
  const registradoEm = evidencia?.criado_em ?? ocorrencia.data?.criado_em;

  return (
    <TelaInterna aba="documentacao" cabecalho={{}}>
      <ScreenTitle titulo={titulo ?? 'Prova'} sub={registradoEm ? diaMesHora(registradoEm) : undefined} acao={() => router.back()} />

      {arquivo.isLoading ? <Carregando rotulo="Abrindo e conferindo o arquivo…" /> : null}
      {arquivo.isError ? (
        <ErroCarregar
          erro={arquivo.error instanceof ErroApi ? arquivo.error : new ErroApi('rede', 0, 'Não foi possível baixar o arquivo. Confira sua internet.')}
          aoTentar={() => arquivo.refetch()}
        />
      ) : null}

      {dados ? (
        <>
          {dados.link.tipo === 'IMAGE' ? (
            <Pressable onPress={() => setTelaCheia(true)} accessibilityRole="imagebutton" accessibilityLabel="Ver foto em tela cheia">
              <Image source={{ uri: dados.uri }} contentFit="cover" style={{ width: '100%', height: 260, borderRadius: raios.card }} />
            </Pressable>
          ) : null}
          {dados.link.tipo === 'VIDEO' ? <PlayerVideo uri={dados.uri} /> : null}
          {dados.link.tipo === 'AUDIO' ? <PlayerAudio uri={dados.uri} /> : null}
          {dados.link.tipo === 'DOCUMENTO' ? (
            <Botao variante="secundario" icone={<Icone nome="file-text" tamanho={20} cor={cores.acento} />} onPress={() => WebBrowser.openBrowserAsync(dados.link.url)}>
              Abrir documento
            </Botao>
          ) : null}

          <CartaoInfo
            icone="lock-keyhole"
            titulo="Guardado com segurança"
            corpo={registradoEm ? `Criptografado neste aparelho em ${diaMesHora(registradoEm)}.` : 'Guardado no seu cofre.'}
            borda={cores.verde30}
            corIcone={cores.verde}
            fundoIcone={cores.verde12}
          />

          {dados.confere ? (
            <Cartao borda={cores.verde30} estilo={{ gap: 12 }}>
              <CirculoIcone nome="shield-check" cor={cores.verde} fundo={cores.verde12} />
              <View style={{ gap: 8 }}>
                <Texto variante="cardTitulo">Prova verificada</Texto>
                <Texto variante="cardCorpo">O arquivo não foi alterado desde o registro. Isso é o que dá valor legal a ele.</Texto>
                <View style={{ gap: 4, paddingVertical: 12, paddingHorizontal: 16, borderRadius: raios.card, backgroundColor: cores.borda04 }}>
                  <Texto variante="nota">Hash de integridade</Texto>
                  <Texto variante="cardCorpo" cor="texto" accessibilityLabel={`Hash ${dados.link.hash_integridade}`}>
                    {hashResumido(dados.link.hash_integridade)}
                  </Texto>
                  {registradoEm ? <Texto variante="nota">{`Registrado em ${diaMesHora(registradoEm)}`}</Texto> : null}
                </View>
              </View>
            </Cartao>
          ) : (
            <CartaoInfo
              icone="triangle-alert"
              titulo="Não foi possível confirmar a integridade"
              corpo="O arquivo recebido é diferente do que foi guardado. Ele pode ter sido corrompido no caminho. Tente abrir de novo."
              corIcone={fixas.sos}
              fundoIcone="rgba(198,40,40,0.10)"
              onPress={() => arquivo.refetch()}
            />
          )}
        </>
      ) : null}

      <Modal visible={telaCheia && dados?.link.tipo === 'IMAGE'} transparent animationType="fade" onRequestClose={() => setTelaCheia(false)}>
        <Pressable
          onPress={() => setTelaCheia(false)}
          accessibilityRole="button"
          accessibilityLabel="Fechar foto"
          style={{ flex: 1, backgroundColor: fixas.overlayFoto, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}
        >
          {dados ? <Image source={{ uri: dados.uri }} contentFit="contain" style={{ width: '100%', flex: 1 }} /> : null}
          <Texto variante="nota" corLivre="rgba(255,255,255,0.75)">
            Toque em qualquer lugar para fechar.
          </Texto>
        </Pressable>
      </Modal>
    </TelaInterna>
  );
}
