import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { voltar } from '@/controllers/navegacao';
import { useTelaEvidencia } from '@/controllers/telas/autenticada/ocorrencias/useTelaEvidencia';
import { PlayerAudio, PlayerVideo } from '@/views/components/dominio/Players';
import { ScreenTitle } from '@/views/components/layout/ScreenTitle';
import { TelaInterna } from '@/views/components/layout/TelaInterna';
import { Botao } from '@/views/components/ui/Botao';
import { Cartao, CartaoInfo, CirculoIcone } from '@/views/components/ui/Cartao';
import { Carregando, ErroCarregar } from '@/views/components/ui/Estados';
import { Icone } from '@/views/components/ui/Icone';
import { Texto } from '@/views/components/ui/Texto';
import { useTema } from '@/views/theme/tema';
import { fixas, raios } from '@/views/theme/tokens';
import { diaMesHora } from '@/utils/datas';

// "Detalhe da prova": abre o arquivo e mostra se ele é o mesmo que foi guardado.
export default function TelaEvidencia() {
  const { titulo, registradoEm, dados, ...c } = useTelaEvidencia();
  const { cores } = useTema();
  const [telaCheia, setTelaCheia] = useState(false);

  return (
    <TelaInterna aba="documentacao" cabecalho={{}}>
      <ScreenTitle titulo={titulo ?? 'Prova'} sub={registradoEm ? diaMesHora(registradoEm) : undefined} acao={voltar} />

      {c.carregando ? <Carregando rotulo="Abrindo e conferindo o arquivo…" /> : null}
      {c.erroCarregar !== null ? <ErroCarregar mensagem={c.erroCarregar} aoTentar={c.tentarDeNovo} /> : null}

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
            <Botao variante="secundario" icone={<Icone nome="file-text" tamanho={20} cor={cores.acento} />} onPress={() => c.abrirDocumento(dados.link.url)}>
              Abrir documento
            </Botao>
          ) : null}

          <CartaoInfo
            icone="lock-keyhole"
            titulo="Guardado com segurança"
            corpo={registradoEm ? `Guardado no seu cofre em ${diaMesHora(registradoEm)}.` : 'Guardado no seu cofre.'}
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
                    {c.hashCurto}
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
              onPress={c.tentarDeNovo}
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
