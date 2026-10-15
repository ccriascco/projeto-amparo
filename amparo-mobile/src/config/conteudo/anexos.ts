import type { TipoAnexo } from '@/models/stores/anexos';
import type { NomeIcone } from '@/views/components/ui/Icone';

// Ícone de cada tipo de anexo na lista da nova ocorrência.
export const ICONE_ANEXO: Record<TipoAnexo, NomeIcone> = { foto: 'camera', video: 'video', audio: 'mic', documento: 'file-text' };
