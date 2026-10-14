import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiEmergencias, apiGuardioes, apiOcorrencias, apiUsuarias } from '@/api/endpoints';
import type { GuardiaoCadastro, NovaOcorrencia, Perfil } from '@/api/tipos';
import { useSessao } from '@/store/sessao';

// Chaves de cache por recurso. Toda alteração invalida o que depende dela.
export const chaves = {
  perfil: ['perfil'] as const,
  guardioes: ['guardioes'] as const,
  ocorrencias: ['ocorrencias'] as const,
  ocorrencia: (id: string) => ['ocorrencias', id] as const,
  emergenciaAtiva: ['emergencia', 'ativa'] as const,
  emergencia: (id: string) => ['emergencia', id] as const,
};

const sessaoAtiva = () => useSessao.getState().estado === 'ativa';

/* ---------- conta ---------- */

export function usePerfil() {
  return useQuery({ queryKey: chaves.perfil, queryFn: apiUsuarias.perfil, enabled: sessaoAtiva() });
}

export function useAtualizarPerfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiUsuarias.atualizarPerfil,
    onSuccess: async (r) => {
      qc.setQueryData<Perfil>(chaves.perfil, r.usuaria);
      await useSessao.getState().atualizarNome(r.usuaria.nome_completo);
      await useSessao.getState().definirModoDisfarce(r.usuaria.modo_disfarcado);
    },
  });
}

/* ---------- guardiãs ---------- */

export function useGuardioes() {
  return useQuery({ queryKey: chaves.guardioes, queryFn: async () => (await apiGuardioes.listar()).guardioes ?? [] });
}

export function useSalvarGuardia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id?: string; dados: GuardiaoCadastro }) => (id ? apiGuardioes.atualizar(id, dados) : apiGuardioes.criar(dados)),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.guardioes }),
  });
}

export function useRemoverGuardia() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: apiGuardioes.remover, onSuccess: () => qc.invalidateQueries({ queryKey: chaves.guardioes }) });
}

export function useReenviarConvite() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: apiGuardioes.reenviarConvite, onSuccess: () => qc.invalidateQueries({ queryKey: chaves.guardioes }) });
}

/* ---------- ocorrências ---------- */

// O backend devolve no máximo 100 por página; o app carrega até 100 de uma vez,
// o suficiente para a lista, o filtro por período e as barras da semana.
export function useOcorrencias() {
  return useQuery({
    queryKey: chaves.ocorrencias,
    queryFn: ({ signal }) => apiOcorrencias.listar(100, 0, signal),
  });
}

export function useOcorrencia(id: string) {
  return useQuery({ queryKey: chaves.ocorrencia(id), queryFn: async () => (await apiOcorrencias.buscar(id)).ocorrencia, enabled: !!id });
}

/** Depois de salvar/editar, o backend recalcula o risco com a IA em segundo plano: o perfil é recarregado em seguida. */
function aposMudarOcorrencias(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: chaves.ocorrencias });
  setTimeout(() => qc.invalidateQueries({ queryKey: chaves.perfil }), 2500);
}

export function useCriarOcorrencia() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (dados: NovaOcorrencia) => apiOcorrencias.criar(dados), onSuccess: () => aposMudarOcorrencias(qc) });
}

export function useEditarOcorrencia(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: Partial<NovaOcorrencia>) => apiOcorrencias.atualizar(id, dados),
    onSuccess: () => aposMudarOcorrencias(qc),
  });
}

export function useRemoverOcorrencia() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: apiOcorrencias.remover, onSuccess: () => aposMudarOcorrencias(qc) });
}

/* ---------- emergência ---------- */

export function useEmergenciaAtiva() {
  return useQuery({ queryKey: chaves.emergenciaAtiva, queryFn: apiEmergencias.ativa });
}

/** "Quem foi avisada" é atualizado a cada 10 s enquanto a tela estiver aberta */
export function useEmergencia(id: string | undefined) {
  return useQuery({
    queryKey: chaves.emergencia(id ?? ''),
    queryFn: () => apiEmergencias.detalhe(id as string),
    enabled: !!id,
    refetchInterval: 10_000,
  });
}
