import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTema } from '@/theme/tema';
import { alturaLinha, type ChaveCor, fontes, type PesoFonte, tamanhos, trackingNota } from '@/theme/tokens';

// Papéis tipográficos do design (classes .amparo-* e estilos inline repetidos nas telas)
const variantes = {
  hero: { familia: 'display', peso: 700, tamanho: tamanhos.titulo, linha: alturaLinha.justa },
  titulo: { familia: 'core', peso: 700, tamanho: tamanhos.titulo, linha: alturaLinha.justa },
  tituloMedio: { familia: 'core', peso: 700, tamanho: tamanhos.tituloMedio, linha: alturaLinha.justa },
  cardTitulo: { familia: 'core', peso: 600, tamanho: tamanhos.cardTitulo, linha: alturaLinha.justa },
  secao: { familia: 'core', peso: 700, tamanho: tamanhos.cardTitulo, linha: alturaLinha.justa },
  subtitulo: { familia: 'core', peso: 400, tamanho: tamanhos.corpo, linha: alturaLinha.corpo },
  corpo: { familia: 'core', peso: 400, tamanho: tamanhos.corpo, linha: alturaLinha.corpo },
  cardCorpo: { familia: 'core', peso: 400, tamanho: tamanhos.cardCorpo, linha: alturaLinha.corpo },
  rotulo: { familia: 'core', peso: 700, tamanho: tamanhos.corpo, linha: alturaLinha.justa },
  link: { familia: 'core', peso: 700, tamanho: tamanhos.cardCorpo, linha: alturaLinha.justa },
  nota: { familia: 'core', peso: 300, tamanho: tamanhos.nota, linha: alturaLinha.corpo },
} as const;

export type VarianteTexto = keyof typeof variantes;

const corPadrao: Record<VarianteTexto, ChaveCor> = {
  hero: 'texto',
  titulo: 'texto',
  tituloMedio: 'texto',
  cardTitulo: 'texto',
  secao: 'texto',
  subtitulo: 'textoSuave',
  corpo: 'texto',
  cardCorpo: 'textoSuave',
  rotulo: 'acento',
  link: 'acento',
  nota: 'nota',
};

type Props = TextProps & {
  variante?: VarianteTexto;
  cor?: ChaveCor;
  corLivre?: string;
  peso?: PesoFonte;
  tamanho?: number;
  centro?: boolean;
};

export function Texto({ variante = 'corpo', cor, corLivre, peso, tamanho, centro, style, ...resto }: Props) {
  const { cores } = useTema();
  const v = variantes[variante];
  const fonte = peso ? fontes.core[peso] : v.familia === 'display' ? fontes.display[700] : fontes.core[v.peso];
  const t = tamanho ?? v.tamanho;
  const estilo: TextStyle = {
    fontFamily: fonte,
    fontSize: t,
    lineHeight: Math.round(t * v.linha),
    color: corLivre ?? cores[cor ?? corPadrao[variante]],
    letterSpacing: variante === 'nota' ? trackingNota : undefined,
    textAlign: centro ? 'center' : undefined,
  };
  return <Text {...resto} style={[estilo, style]} />;
}
