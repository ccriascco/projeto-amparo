import { useMemo, useState } from 'react';

import { useOcorrencias } from '@/controllers/dados';
import { useTelaPrivada } from '@/controllers/privacidade';
import { MENSAGEM_CARREGAR, mensagemDeErro } from '@/services/api/erros';
import { diaDaOcorrencia, periodoDe } from '@/utils/datas';

export const FILTROS = ['Todos', 'Esta semana', 'Este mês', 'Mais antigas'] as const;
export type Filtro = (typeof FILTROS)[number];

// Todos os registros, com o filtro por período. Tela protegida contra print.
export function useTelaTodosRegistros() {
  useTelaPrivada();
  const ocorrencias = useOcorrencias();
  const [filtro, setFiltro] = useState<Filtro>('Todos');

  const lista = useMemo(
    () => (ocorrencias.data?.ocorrencias ?? []).filter((o) => filtro === 'Todos' || periodoDe(diaDaOcorrencia(o)) === filtro),
    [ocorrencias.data, filtro],
  );

  return {
    filtro,
    escolherFiltro: setFiltro,
    lista,
    carregando: ocorrencias.isLoading,
    erroCarregar: ocorrencias.isError ? mensagemDeErro(ocorrencias.error, MENSAGEM_CARREGAR) : null,
    carregou: ocorrencias.isSuccess,
    tentarDeNovo: () => ocorrencias.refetch(),
    // Quantos registros aparecem quando o servidor tem mais do que veio na lista
    mostrandoParcial:
      ocorrencias.data && ocorrencias.data.total > ocorrencias.data.ocorrencias.length ? ocorrencias.data.ocorrencias.length : null,
  };
}
