import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { apiUsuarias } from '@/services/api/endpoints';
import { ErroApi } from '@/services/api/erros';
import { TelaInterna } from '@/views/components/layout/TelaInterna';
import { Botao } from '@/views/components/ui/Botao';
import { EntradaPin } from '@/views/components/ui/EntradaPin';
import { Texto } from '@/views/components/ui/Texto';
import { chaves, useAtualizarPerfil, usePerfil } from '@/controllers/dados';
import { useSessao } from '@/models/stores/sessao';
import { useTema } from '@/views/theme/tema';

// "Alterar código" do protótipo. Também serve para criar o código quando ela liga o
// Modo Disfarce (motivo=disfarce) ou toca na calculadora do cabeçalho sem ter um (motivo=calculadora).
export default function TelaCodigo() {
  const { motivo } = useLocalSearchParams<{ motivo?: 'disfarce' | 'calculadora' }>();
  const { cores } = useTema();
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
  const corAviso = erroAtual || divergente ? cores.sair : pronto ? cores.verde : cores.nota;

  const sub =
    motivo === 'calculadora'
      ? 'Para esconder o app na calculadora, crie primeiro um código de quatro números.'
      : motivo === 'disfarce'
        ? 'Para ligar o Modo Disfarce, crie um código de quatro números.'
        : 'Escolha quatro números novos para destravar o app na calculadora.';

  return (
    <TelaInterna cabecalho={{ titulo: temCodigo ? 'Alterar código' : 'Criar código', sub, aoFecharTopo: () => router.back() }} semNav paddingTopo={32}>
      {temCodigo ? (
        <EntradaPin
          rotulo="Código atual"
          valor={atual}
          aoMudar={(v) => {
            setAtual(v);
            setErroAtual(false);
          }}
          erro={erroAtual}
        />
      ) : null}
      <EntradaPin rotulo="Novo código" valor={novo} aoMudar={setNovo} />
      <View style={{ gap: 8 }}>
        <EntradaPin rotulo="Confirmar novo código" valor={conf} aoMudar={setConf} erro={divergente} />
        <Texto variante="nota" corLivre={corAviso} accessibilityLiveRegion="polite">
          {aviso}
        </Texto>
      </View>
      {salvar.isError && !erroAtual ? (
        <Texto variante="nota" corLivre={cores.sair}>
          {salvar.error instanceof ErroApi ? salvar.error.mensagem : 'Não foi possível salvar o código.'}
        </Texto>
      ) : null}
      <Botao onPress={() => salvar.mutate()} desabilitado={!pronto} carregando={salvar.isPending} estilo={{ marginTop: 8 }}>
        Salvar novo código
      </Botao>
    </TelaInterna>
  );
}
