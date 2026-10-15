import { voltar } from '@/controllers/navegacao';
import { useTelaArtigo } from '@/controllers/telas/autenticada/mais/useTelaArtigo';
import { TelaInterna } from '@/views/components/layout/TelaInterna';
import { Botao } from '@/views/components/ui/Botao';
import { Texto } from '@/views/components/ui/Texto';

export default function TelaArtigo() {
  const { artigo: a } = useTelaArtigo();
  return (
    <TelaInterna cabecalho={{ titulo: a.titulo, sub: a.resumo, aoFecharTopo: voltar }} semNav paddingTopo={32}>
      <Texto variante="subtitulo" style={{ lineHeight: 26 }}>
        {a.texto}
      </Texto>
      <Texto variante="nota">{a.fonte}</Texto>
      <Botao variante="secundario" onPress={voltar} estilo={{ marginTop: 8 }}>
        Voltar para a lista
      </Botao>
    </TelaInterna>
  );
}
