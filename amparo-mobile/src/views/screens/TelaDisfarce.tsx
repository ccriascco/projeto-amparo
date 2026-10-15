import { useTelaDisfarce } from '@/controllers/telas/useTelaDisfarce';
import { Calculadora } from '@/views/components/dominio/Calculadora';

// Modo Disfarce: uma calculadora que funciona de verdade (a lógica do código fica no controller).
export default function TelaDisfarce() {
  const { tentar } = useTelaDisfarce();
  return <Calculadora aoTentarCodigo={tentar} />;
}
