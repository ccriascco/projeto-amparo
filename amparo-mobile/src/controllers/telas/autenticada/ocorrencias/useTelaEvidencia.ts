import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';

import { useOcorrencia } from '@/controllers/dados';
import { useTelaPrivada } from '@/controllers/privacidade';
import { apiOcorrencias } from '@/services/api/endpoints';
import { mensagemDeErro } from '@/services/api/erros';
import { baixarEConferir, hashResumido, limparCacheEvidencias } from '@/services/integridade';

const EXTENSAO = { IMAGE: 'jpg', VIDEO: 'mp4', AUDIO: 'm4a', DOCUMENTO: 'pdf' } as const;

// "Detalhe da prova": baixa o arquivo e confere se ele é o mesmo que foi guardado. Tela protegida contra print.
export function useTelaEvidencia() {
  useTelaPrivada();
  const { ocorrenciaId, evidenciaId, titulo } = useLocalSearchParams<{ ocorrenciaId: string; evidenciaId: string; titulo?: string }>();
  const ocorrencia = useOcorrencia(ocorrenciaId);
  const evidencia = ocorrencia.data?.evidencias?.find((e) => e.id === evidenciaId);

  // Link temporário (5 min) + download para o cache do app + conferência do SHA-256
  const arquivo = useQuery({
    queryKey: ['evidencia', evidenciaId],
    queryFn: async () => {
      const link = await apiOcorrencias.linkEvidencia(ocorrenciaId, evidenciaId);
      const verificado = await baixarEConferir(link.url, link.hash_integridade, `${evidenciaId}.${EXTENSAO[link.tipo]}`);
      return { ...verificado, link };
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  useEffect(() => () => limparCacheEvidencias(), []);

  const dados = arquivo.data;
  return {
    titulo,
    registradoEm: evidencia?.criado_em ?? ocorrencia.data?.criado_em,
    carregando: arquivo.isLoading,
    erroCarregar: arquivo.isError ? mensagemDeErro(arquivo.error, 'Não foi possível baixar o arquivo. Confira sua internet.') : null,
    tentarDeNovo: () => arquivo.refetch(),
    dados,
    hashCurto: dados ? hashResumido(dados.link.hash_integridade) : '',
    abrirDocumento: (url: string) => WebBrowser.openBrowserAsync(url),
  };
}
