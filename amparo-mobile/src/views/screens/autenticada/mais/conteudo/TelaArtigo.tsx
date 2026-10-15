import { router, useLocalSearchParams } from 'expo-router';

import { TelaInterna } from '@/views/components/layout/TelaInterna';
import { Botao } from '@/views/components/ui/Botao';
import { Texto } from '@/views/components/ui/Texto';
import { ARTIGOS } from '@/config/conteudo/textos';

export default function TelaArtigo() {
  const { artigo } = useLocalSearchParams<{ artigo: string }>();
  const a = ARTIGOS[Number(artigo)] ?? ARTIGOS[0];
  return (
    <TelaInterna cabecalho={{ titulo: a.titulo, sub: a.resumo, aoFecharTopo: () => router.back() }} semNav paddingTopo={32}>
      <Texto variante="subtitulo" style={{ lineHeight: 26 }}>
        {a.texto}
      </Texto>
      <Texto variante="nota">{a.fonte}</Texto>
      <Botao variante="secundario" onPress={() => router.back()} estilo={{ marginTop: 8 }}>
        Voltar para a lista
      </Botao>
    </TelaInterna>
  );
}
