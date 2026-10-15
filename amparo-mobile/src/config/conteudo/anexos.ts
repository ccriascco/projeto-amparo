import type { TipoAnexo } from '@/models/stores/anexos';
import type { NomeIcone } from '@/views/components/ui/Icone';

// Nome e ícone de cada tipo de anexo (lista da nova ocorrência e mensagens de limite).
export const ROTULO_ANEXO: Record<TipoAnexo, string> = { foto: 'Foto', video: 'Vídeo', audio: 'Áudio', documento: 'Documento' };
export const ICONE_ANEXO: Record<TipoAnexo, NomeIcone> = { foto: 'camera', video: 'video', audio: 'mic', documento: 'file-text' };
