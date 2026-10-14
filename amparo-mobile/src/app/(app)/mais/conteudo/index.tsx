import { router } from 'expo-router';
import { View } from 'react-native';

import { TelaInterna } from '@/components/layout/TelaInterna';
import { Cartao, CirculoIcone } from '@/components/ui/Cartao';
import { Texto } from '@/components/ui/Texto';
import { ARTIGOS } from '@/conteudo/textos';

export default function TelaConteudo() {
  return (
    <TelaInterna
      aba="mais"
      cabecalho={{ titulo: 'Conteúdo e direitos', sub: 'O que a lei garante para você, em linguagem simples.', aoFecharTopo: () => router.back() }}
      gap={12}
    >
      {ARTIGOS.map((a, i) => (
        <Cartao
          key={a.titulo}
          onPress={() => router.push({ pathname: '/mais/conteudo/[artigo]', params: { artigo: String(i) } })}
          rotuloAcessivel={`${a.titulo}. ${a.resumo} Ler mais.`}
          estilo={{ gap: 8 }}
        >
          <CirculoIcone nome={a.icone} />
          <View style={{ gap: 4 }}>
            <Texto variante="cardTitulo">{a.titulo}</Texto>
            <Texto variante="cardCorpo">{a.resumo}</Texto>
            <Texto variante="link">Ler mais</Texto>
          </View>
        </Cartao>
      ))}
    </TelaInterna>
  );
}
