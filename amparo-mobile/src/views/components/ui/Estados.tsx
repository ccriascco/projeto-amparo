import { ActivityIndicator, View } from 'react-native';

import { useTema } from '@/views/theme/tema';

import { Botao } from './Botao';
import { Cartao, CirculoIcone } from './Cartao';
import type { NomeIcone } from './Icone';
import { Texto } from './Texto';

// Estados que o design não desenha (carregando, vazio, erro), no mesmo estilo dos cards.

export function Carregando({ rotulo = 'Carregando…' }: { rotulo?: string }) {
  const { cores } = useTema();
  return (
    <View style={{ paddingVertical: 32, alignItems: 'center', gap: 12 }} accessibilityRole="progressbar" accessibilityLabel={rotulo}>
      <ActivityIndicator color={cores.acento} />
      <Texto variante="nota">{rotulo}</Texto>
    </View>
  );
}

export function ErroCarregar({ mensagem, aoTentar }: { mensagem: string; aoTentar: () => void }) {
  return (
    <Cartao estilo={{ gap: 12 }}>
      <CirculoIcone nome="refresh-cw" />
      <View style={{ gap: 4 }}>
        <Texto variante="cardTitulo">Não foi possível carregar</Texto>
        <Texto variante="cardCorpo" accessibilityLiveRegion="polite">
          {mensagem}
        </Texto>
      </View>
      <Botao variante="secundario" compacto onPress={aoTentar} estilo={{ alignSelf: 'flex-start' }}>
        Tentar de novo
      </Botao>
    </Cartao>
  );
}

export function Vazio({ icone, titulo, texto }: { icone: NomeIcone; titulo: string; texto: string }) {
  return (
    <Cartao estilo={{ gap: 12 }}>
      <CirculoIcone nome={icone} />
      <View style={{ gap: 4 }}>
        <Texto variante="cardTitulo">{titulo}</Texto>
        <Texto variante="cardCorpo">{texto}</Texto>
      </View>
    </Cartao>
  );
}
