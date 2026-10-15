import { useRef } from 'react';

import { Calculadora } from '@/views/components/dominio/Calculadora';
import { useSessao } from '@/models/stores/sessao';

// Modo Disfarce: uma calculadora que funciona de verdade.
// O código de 4 números + "=" destrava o app. Se alguém digitar errado, nada acontece
// na tela (sem mensagem nem vibração, para não revelar que existe algo escondido).
export default function TelaDisfarce() {
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

  return <Calculadora aoTentarCodigo={tentar} />;
}
