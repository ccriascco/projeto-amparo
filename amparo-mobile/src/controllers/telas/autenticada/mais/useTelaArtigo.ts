import { useLocalSearchParams } from 'expo-router';

import { ARTIGOS } from '@/config/conteudo/textos';

export function useTelaArtigo() {
  const { artigo } = useLocalSearchParams<{ artigo: string }>();
  return { artigo: ARTIGOS[Number(artigo)] ?? ARTIGOS[0] };
}
