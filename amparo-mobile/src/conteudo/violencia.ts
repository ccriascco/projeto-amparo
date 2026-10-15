import type { TipoViolencia } from '@/api/tipos';
import type { NomeIcone } from '@/components/ui/Icone';

// Ícones dos tipos de violência. Os 4 primeiros são do design; Moral e Ameaça foram incluídos
// (aprovado) porque existem no backend e "Ameaça" pesa na classificação de risco.
export const ICONE_VIOLENCIA: Record<TipoViolencia, NomeIcone> = {
  Física: 'hand',
  Psicológica: 'brain',
  Sexual: 'shield-alert',
  Patrimonial: 'wallet',
  Moral: 'megaphone',
  Ameaça: 'triangle-alert',
};
