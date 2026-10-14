import { File } from 'expo-file-system';
import { create } from 'zustand';

import type { NomeIcone } from '@/components/ui/Icone';
import { diaMesHora } from '@/utils/datas';

// Anexos escolhidos na "Nova ocorrência" (ainda não enviados). Ficam só em memória
// e em arquivos temporários do app: nada vai para a galeria do celular.
export type TipoAnexo = 'foto' | 'video' | 'audio' | 'documento';

export type Anexo = {
  id: string;
  uri: string;
  nome: string;
  mime: string;
  tipo: TipoAnexo;
  detalhe: string;
};

// Limites do backend (amparo-backend/src/ocorrencias/ocorrencias.service.ts)
export const LIMITE_MB: Record<TipoAnexo, number> = { foto: 5, audio: 10, documento: 10, video: 20 };

export const MIMES_ACEITOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/mp4',
  'audio/x-m4a',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'application/pdf',
];

export const ROTULO_ANEXO: Record<TipoAnexo, string> = { foto: 'Foto', video: 'Vídeo', audio: 'Áudio', documento: 'Documento' };
export const ICONE_ANEXO: Record<TipoAnexo, NomeIcone> = { foto: 'camera', video: 'video', audio: 'mic', documento: 'file-text' };

export function tipoPorMime(mime: string): TipoAnexo | null {
  if (mime.startsWith('image/')) return 'foto';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'documento';
  return null;
}

/** Confere tipo e tamanho antes de anexar; devolve a mensagem de erro ou null */
export function problemaDoArquivo(uri: string, mime: string): string | null {
  const tipo = tipoPorMime(mime);
  if (!tipo || !MIMES_ACEITOS.includes(mime)) return 'Esse formato de arquivo não é aceito. Use foto (JPG ou PNG), vídeo, áudio ou PDF.';
  try {
    const tamanho = new File(uri).size ?? 0;
    if (tamanho > LIMITE_MB[tipo] * 1024 * 1024) return `${ROTULO_ANEXO[tipo]} acima de ${LIMITE_MB[tipo]} MB. Escolha um arquivo menor.`;
  } catch {
    // sem como medir aqui: o backend confere o tamanho de novo
  }
  return null;
}

type Estado = {
  anexos: Anexo[];
  adicionar: (a: Omit<Anexo, 'id' | 'detalhe'> & { detalhe?: string }) => void;
  remover: (id: string) => void;
  limpar: () => void;
};

let sequencia = 0;

export const useAnexos = create<Estado>()((set) => ({
  anexos: [],
  adicionar: (a) =>
    set((s) => ({
      anexos: [...s.anexos, { ...a, id: `anexo-${++sequencia}`, detalhe: a.detalhe ?? diaMesHora(new Date().toISOString()) }],
    })),
  remover: (id) => set((s) => ({ anexos: s.anexos.filter((x) => x.id !== id) })),
  limpar: () => set({ anexos: [] }),
}));
