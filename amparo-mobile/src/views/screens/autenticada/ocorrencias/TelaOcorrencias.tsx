import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { ItemOcorrencia } from '@/views/components/dominio/ItemOcorrencia';
import { TelaInterna } from '@/views/components/layout/TelaInterna';
import { Botao } from '@/views/components/ui/Botao';
import { Cartao, CirculoIcone } from '@/views/components/ui/Cartao';
import { Carrossel } from '@/views/components/ui/Carrossel';
import { Carregando, ErroCarregar, Vazio } from '@/views/components/ui/Estados';
import { Sheet } from '@/views/components/ui/Sheet';
import { Texto } from '@/views/components/ui/Texto';
import { FAQ_DOC, POR_QUE_REGISTRAR } from '@/config/conteudo/textos';
import { useOcorrencias } from '@/controllers/dados';
import { useTema } from '@/views/theme/tema';
import { fontes } from '@/views/theme/tokens';
import { useTelaPrivada } from '@/controllers/privacidade';

export default function TelaOcorrencias() {
  useTelaPrivada();
  const { cores } = useTema();
  const ocorrencias = useOcorrencias();
  const [info, setInfo] = useState<{ titulo: string; texto: string } | null>(null);
  const lista = ocorrencias.data?.ocorrencias ?? [];
  const total = ocorrencias.data?.total ?? 0;

  return (
    <TelaInterna
      aba="documentacao"
      cabecalho={{ titulo: 'Ocorrências', sub: 'O que você guardou fica em um cofre que só você abre.' }}
      controleAtualizar={<RefreshControl refreshing={ocorrencias.isRefetching} onRefresh={() => ocorrencias.refetch()} tintColor={cores.acento} />}
      sobreposicao={<Sheet visivel={!!info} aoFechar={() => setInfo(null)} titulo={info?.titulo} texto={info?.texto} />}
    >
      <Cartao borda={cores.borda12} estilo={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: cores.borda10, alignItems: 'center', justifyContent: 'center' }}>
          <Texto corLivre={cores.acento} style={{ fontFamily: fontes.display[700], fontSize: 31, lineHeight: 34 }} accessibilityLabel={`${total} ocorrências`}>
            {ocorrencias.isLoading ? '…' : String(total)}
          </Texto>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Texto peso={700} tamanho={18} style={{ lineHeight: 22 }}>
            Ocorrências registradas
          </Texto>
          <Texto tamanho={12} cor="textoSuave" style={{ lineHeight: 17 }}>
            Criptografado e guardado só no seu aparelho. Só você tem a chave que abre esse cofre.
          </Texto>
        </View>
      </Cartao>

      <Botao onPress={() => router.push('/ocorrencias/nova')}>Registrar nova ocorrência</Botao>

      <Carrossel rotulo="Dúvidas sobre ocorrências">
        {FAQ_DOC.map((f) => (
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

      <View style={{ gap: 12 }}>
        <Texto variante="cardTitulo" accessibilityRole="header">
          Últimos registros
        </Texto>
        {ocorrencias.isLoading ? <Carregando rotulo="Carregando seus registros…" /> : null}
        {ocorrencias.isError ? <ErroCarregar erro={ocorrencias.error} aoTentar={() => ocorrencias.refetch()} /> : null}
        {ocorrencias.isSuccess && lista.length === 0 ? (
          <Vazio icone="notebook-pen" titulo="Nenhum registro ainda" texto="Quando você registrar uma ocorrência, ela aparece aqui." />
        ) : null}
        {lista.slice(0, 3).map((o) => (
          <ItemOcorrencia key={o.id} ocorrencia={o} />
        ))}
        {lista.length > 3 ? (
          <Pressable onPress={() => router.push('/ocorrencias/todas')} accessibilityRole="button" style={{ alignSelf: 'center', paddingVertical: 8 }}>
            <Texto variante="link">Ver mais</Texto>
          </Pressable>
        ) : null}
      </View>

      <Cartao onPress={() => setInfo(POR_QUE_REGISTRAR)} borda={cores.borda12} estilo={{ gap: 8 }} rotuloAcessivel="Por que registrar uma ocorrência. Saiba mais.">
        <CirculoIcone nome="notebook-pen" />
        <View style={{ gap: 4 }}>
          <Texto peso={600} tamanho={18} style={{ lineHeight: 22 }}>
            Por que registrar uma ocorrência
          </Texto>
          <Texto variante="cardCorpo">A memória falha; o registro com data, não.</Texto>
          <Texto variante="link">Saiba mais</Texto>
        </View>
      </Cartao>
    </TelaInterna>
  );
}
