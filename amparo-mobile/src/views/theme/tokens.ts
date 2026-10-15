// Design tokens do Amparo, extraídos do Design.html (design system "AmparoDesignSystem_e053d3"
// e variáveis --am-* do protótipo). Único lugar onde cores, tipografia, espaços e raios são definidos.

export type NomeTema = 'claro' | 'escuro';

const vinho = (alfa: number) => `rgba(149,75,110,${alfa})`;
const branco = (alfa: number) => `rgba(255,255,255,${alfa})`;

const claro = {
  palco: '#FCFBFA',
  tela: '#FFFFFF',
  card: '#FFFFFF',
  texto: '#1A1A1A',
  textoSuave: 'rgba(26,26,26,0.8)',
  textoSecundario: '#8A8A8E',
  textoPlaceholder: 'rgba(75,42,63,0.20)',
  textoDesabilitado: '#8A8A8E',
  acento: '#954B6E',
  acentoHover: '#84415F',
  acentoPressionado: '#733851',
  nota: '#4B2A3F',
  fundoDesabilitado: '#EDE3E8',
  borda04: vinho(0.04),
  borda08: vinho(0.08),
  borda10: vinho(0.1),
  borda12: vinho(0.12),
  borda15: vinho(0.15),
  borda20: vinho(0.2),
  borda40: vinho(0.4),
  verde: '#5BA37F',
  verde12: 'rgba(91,163,127,0.12)',
  verde30: 'rgba(91,163,127,0.30)',
  verdeTexto: '#3F7F63',
  sair: '#A85C5C',
  sombraCard: true,
};

const escuro: typeof claro = {
  palco: '#120E14',
  tela: '#1C1620',
  card: '#26202B',
  texto: '#FFFFFF',
  textoSuave: '#A79CA3',
  textoSecundario: '#A79CA3',
  textoPlaceholder: branco(0.35),
  textoDesabilitado: '#6F6570',
  acento: '#B36A8C',
  acentoHover: '#C27C9C',
  acentoPressionado: '#9C577A',
  nota: '#A79CA3',
  fundoDesabilitado: '#322A36',
  borda04: branco(0.05),
  borda08: branco(0.08),
  borda10: branco(0.08),
  borda12: branco(0.1),
  borda15: branco(0.1),
  borda20: branco(0.12),
  borda40: branco(0.22),
  verde: '#2E7D6B',
  verde12: 'rgba(46,125,107,0.16)',
  verde30: 'rgba(46,125,107,0.35)',
  verdeTexto: '#7CCFB4',
  sair: '#E08A8A',
  sombraCard: false,
};

export type Cores = typeof claro;
// Só as chaves que são cores (exclui flags como sombraCard)
export type ChaveCor = { [K in keyof Cores]: Cores[K] extends string ? K : never }[keyof Cores];
export const cores: Record<NomeTema, Cores> = { claro, escuro };

// Cores que não mudam com o tema
export const fixas = {
  vinho: '#954B6E',
  vinhoProfundo: '#4B2A3F',
  sos: '#C62828',
  sosPressionado: '#A72020',
  branco: '#FFFFFF',
  preto: '#000000',
  overlay: 'rgba(75,42,63,0.45)',
  overlayFoto: 'rgba(75,42,63,0.92)',
  gradienteHeader: ['#954B6E', '#4B2A3F'] as const,
  gradienteMarca: ['#C77E9C', '#954B6E', '#4B2A3F'] as const,
  midiaFundo: '#151016',
  midiaBarra: '#1C1620',
  calculadora: { fundo: '#000000', escuro: '#333333', cinza: '#A5A5A5', laranja: '#FF9F0A' },
};

// Cada peso é uma família própria no React Native (fontWeight não troca o arquivo no Android)
export const fontes = {
  display: { 700: 'Quicksand_700Bold' },
  core: {
    300: 'NunitoSans_300Light',
    400: 'NunitoSans_400Regular',
    500: 'NunitoSans_500Medium',
    600: 'NunitoSans_600SemiBold',
    700: 'NunitoSans_700Bold',
  },
} as const;

export type PesoFonte = keyof typeof fontes.core;

// Escala tipográfica usada nas telas (px)
export const tamanhos = {
  sos: 39,
  titulo: 31,
  tituloMedio: 25,
  saudacao: 22,
  cardTitulo: 20,
  subtitulo: 18,
  corpo: 16,
  cardCorpo: 14,
  nota: 12,
} as const;

export const alturaLinha = { justa: 1.2, corpo: 1.4, leitura: 1.5, longa: 1.6 } as const;
export const trackingNota = -0.24;

export const layout = {
  margemTela: 32,
  toqueMinimo: 44,
  alturaNav: 56,
  respiroNav: 112,
  larguraMaxima: 520,
} as const;

export const raios = {
  pilula: 999,
  card: 12,
  campoTexto: 16,
  casaPin: 14,
  guia: 20,
  sheet: 32,
  header: 16,
} as const;

export const tamanhoIcone = { circulo: 40, circuloGrande: 72, padrao: 24 } as const;
