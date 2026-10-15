import { useRef } from 'react';

import { useSessao } from '@/models/stores/sessao';

// O código de 4 números + "=" destrava o app. Se alguém digitar errado, nada acontece
// na tela (sem mensagem nem vibração, para não revelar que existe algo escondido).
export function useTelaDisfarce() {
  const desbloquear = useSessao((s) => s.desbloquear);
  const ocupado = useRef(false);

  const tentar = async (codigo: string) => {
    if (ocupado.current) return;
    ocupado.current = true;
    try {
      await desbloquear(codigo);
    } catch {
      // código errado ou sem rede: a calculadora continua normal
    } finally {
      ocupado.current = false;
    }
  };

  return { tentar };
}
