import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { chaves, useAtualizarPerfil, usePerfil } from '@/controllers/dados';
import { useSessao } from '@/models/stores/sessao';
import { apiUsuarias } from '@/services/api/endpoints';
import { ErroApi, mensagemDeErro } from '@/services/api/erros';

/** Tom do aviso abaixo do código: a view escolhe a cor de cada um. */
export type TomAviso = 'erro' | 'ok' | 'neutro';

// "Alterar código" do protótipo. Também serve para criar o código quando ela liga o
// Modo Disfarce (motivo=disfarce) ou toca na calculadora do cabeçalho sem ter um (motivo=calculadora).
export function useTelaCodigo() {
  const { motivo } = useLocalSearchParams<{ motivo?: 'disfarce' | 'calculadora' }>();
  const qc = useQueryClient();
  const perfil = usePerfil();
  const atualizarPerfil = useAtualizarPerfil();
  const lembrarCodigo = useSessao((s) => s.lembrarCodigo);
  const temCodigo = !!perfil.data?.codigo_disfarce_definido;

  const [atual, setAtual] = useState('');
  const [novo, setNovo] = useState('');
  const [conf, setConf] = useState('');
  const [erroAtual, setErroAtual] = useState(false);

  const divergente = conf.length === 4 && novo !== conf;
  const novoOk = novo.length === 4 && novo === conf;
  const pronto = novoOk && (!temCodigo || atual.length === 4);

  const salvar = useMutation({
    mutationFn: async () => {
      await apiUsuarias.trocarCodigo(temCodigo ? atual : undefined, novo);
      await lembrarCodigo(novo);
      if (motivo === 'disfarce') await atualizarPerfil.mutateAsync({ modo_disfarcado: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chaves.perfil });
      if (motivo === 'calculadora') {
        router.back();
        useSessao.getState().travar();
        return;
      }
      router.back();
    },
    onError: (e) => {
      if (e instanceof ErroApi && e.status === 401) setErroAtual(true);
    },
  });

  const aviso = erroAtual
    ? 'O código atual não confere.'
    : divergente
      ? 'Os dois números não são iguais. Confira e digite de novo.'
      : pronto
        ? 'Código novo pronto para salvar.'
        : 'Use quatro números que você lembre com facilidade.';
  const tomAviso: TomAviso = erroAtual || divergente ? 'erro' : pronto ? 'ok' : 'neutro';

  const sub =
    motivo === 'calculadora'
      ? 'Para esconder o app na calculadora, crie primeiro um código de quatro números.'
      : motivo === 'disfarce'
        ? 'Para ligar o Modo Disfarce, crie um código de quatro números.'
        : 'Escolha quatro números novos para destravar o app na calculadora.';

  return {
    temCodigo,
    sub,
    atual,
    novo,
    conf,
    erroAtual,
    divergente,
    pronto,
    aviso,
    tomAviso,
    erroSalvar: salvar.isError && !erroAtual ? mensagemDeErro(salvar.error, 'Não foi possível salvar o código.') : null,
    alterarAtual: (v: string) => {
      setAtual(v);
      setErroAtual(false);
    },
    alterarNovo: setNovo,
    alterarConf: setConf,
    salvar: () => salvar.mutate(),
    salvando: salvar.isPending,
  };
}
