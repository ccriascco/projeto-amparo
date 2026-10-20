import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { chaves, useAtualizarPerfil, useEmergenciaAtiva, useOcorrencias, usePerfil } from '@/controllers/dados';
import { useSessao } from '@/models/stores/sessao';
import { apiEmergencias } from '@/services/api/endpoints';
import { ErroApi } from '@/services/api/erros';
import { diaDaOcorrencia, semanaAtual } from '@/utils/datas';
import { abrirDelegaciasProximas } from '@/utils/mapas';
import { localizacaoAtual } from '@/utils/permissoes';

// Início: pedido de ajuda (SOS), semana de registros, leitura de risco, ações rápidas e guias.
export function useTelaInicio() {
  const qc = useQueryClient();
  const usuaria = useSessao((s) => s.usuaria);
  const perfil = usePerfil();
  const ocorrencias = useOcorrencias();
  const emergenciaAtiva = useEmergenciaAtiva();
  const atualizarPerfil = useAtualizarPerfil();
  const [info, setInfo] = useState<{ titulo: string; texto: string } | null>(null);
  const [erroSos, setErroSos] = useState<string | null>(null);

  const nome = perfil.data?.nome_completo ?? usuaria?.nome_completo ?? '';
  const disfarceLigado = perfil.data?.modo_disfarcado ?? usuaria?.modo_disfarcado ?? false;

  const sos = useMutation({
    mutationFn: async () => {
      // A localização não pode atrasar o pedido: espera no máximo 3 s
      const local = await Promise.race([localizacaoAtual(), new Promise<null>((r) => setTimeout(() => r(null), 3000))]);
      try {
        return (await apiEmergencias.acionar(local ?? undefined)).emergencia_id;
      } catch (e) {
        const ativa = e instanceof ErroApi && e.status === 409 ? (e.dados.emergencia_ativa as { id?: string } | undefined) : undefined;
        if (ativa?.id) return ativa.id;
        throw e;
      }
    },
    onSuccess: (id) => {
      setErroSos(null);
      qc.invalidateQueries({ queryKey: chaves.emergenciaAtiva });
      router.push({ pathname: '/emergencia', params: { id } });
    },
    onError: (e) =>
      setErroSos(
        e instanceof ErroApi
          ? `${e.mensagem} Se puder, ligue 190.`
          : 'Não foi possível enviar o pedido de ajuda. Se puder, ligue 190.',
      ),
  });

  // Quando a leitura foi atualizada: a ocorrência mais recente que recebeu um nível da IA
  const leituraAtualizadaEm = useMemo(() => {
    const datas = (ocorrencias.data?.ocorrencias ?? []).filter((o) => o.nivel_risco).map((o) => o.atualizado_em ?? o.criado_em);
    return datas.sort().at(-1) ?? null;
  }, [ocorrencias.data]);

  const semana = useMemo(() => {
    const dias = new Set((ocorrencias.data?.ocorrencias ?? []).map(diaDaOcorrencia));
    return semanaAtual().map((s) => ({ ...s, registrou: dias.has(s.dia) }));
  }, [ocorrencias.data]);

  const alternarDisfarce = () => {
    const p = perfil.data;
    if (!p) return;
    if (!p.modo_disfarcado && !p.codigo_disfarce_definido) {
      router.push({ pathname: '/mais/codigo', params: { motivo: 'disfarce' } });
      return;
    }
    atualizarPerfil.mutate({ modo_disfarcado: !p.modo_disfarcado });
  };

  const atualizar = () => {
    perfil.refetch();
    ocorrencias.refetch();
    emergenciaAtiva.refetch();
  };

  const emergencia = emergenciaAtiva.data?.emergencia;

  return {
    nome,
    disfarceLigado,
    emergenciaAtiva: !!emergencia,
    abrirEmergenciaAtiva: () => router.push({ pathname: '/emergencia', params: { id: emergenciaAtiva.data!.emergencia!.id } }),
    semana,
    acionarSos: () => sos.mutate(),
    enviandoSos: sos.isPending,
    erroSos,
    info,
    mostrarInfo: setInfo,
    fecharInfo: () => setInfo(null),
    perfil: perfil.data,
    leituraAtualizadaEm,
    carregandoPerfil: perfil.isLoading,
    erroPerfil: perfil.isError,
    recarregarPerfil: () => perfil.refetch(),
    ocorrencias: ocorrencias.data?.ocorrencias,
    atualizando: perfil.isRefetching,
    atualizar,
    registrarProva: () => router.push('/ocorrencias/nova'),
    adicionarGuardiao: () => router.push('/rede/guardia'),
    verOcorrencias: () => router.navigate('/ocorrencias'),
    abrirDelegacias: () => abrirDelegaciasProximas(),
    abrirRecursos: () => router.push('/mais/conteudo'),
    alternarDisfarce,
  };
}
