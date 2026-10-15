import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useGuardioes, useReenviarConvite, useRemoverGuardia, useSalvarGuardia } from '@/controllers/dados';
import type { Guardia } from '@/models/tipos';
import { mensagemDeErro } from '@/services/api/erros';
import { mascararTelefone, somenteDigitos, telefoneValido } from '@/utils/validacao/regras';

/** Adicionar ou editar uma guardiã: com id na rota, espera a lista para achar a existente. */
export function useTelaGuardia() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const guardioes = useGuardioes();
  return {
    id,
    carregando: !!id && guardioes.isLoading,
    existente: id ? guardioes.data?.find((g) => g.id === id) : undefined,
  };
}

export function useFormularioGuardia({ id, existente }: { id?: string; existente?: Guardia }) {
  const editando = !!id;

  const [nome, setNome] = useState(existente?.nome_completo ?? '');
  const [telefone, setTelefone] = useState(existente ? mascararTelefone(existente.telefone) : '');
  const [relacao, setRelacao] = useState<string>(existente?.parentesco_relacao ?? 'Amigos');
  const [erros, setErros] = useState<{ nome?: string; telefone?: string }>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const salvar = useSalvarGuardia();
  const remover = useRemoverGuardia();
  const reenviar = useReenviarConvite();

  const mensagem = (e: unknown) => mensagemDeErro(e, 'Algo deu errado. Tente de novo.');

  const enviar = () => {
    setErroGeral(null);
    const e = {
      nome: nome.trim().length < 2 ? 'Digite o nome dela.' : undefined,
      telefone: telefoneValido(telefone) ? undefined : 'Digite o telefone com DDD.',
    };
    setErros(e);
    if (e.nome || e.telefone) return;
    salvar.mutate(
      { id, dados: { nome_completo: nome.trim(), telefone: somenteDigitos(telefone), parentesco_relacao: relacao } },
      { onSuccess: () => router.back(), onError: (err) => setErroGeral(mensagem(err)) },
    );
  };

  const removerAgora = () => {
    if (!id) return;
    remover.mutate(id, { onSuccess: () => router.back() });
  };

  return {
    editando,
    nome,
    telefone,
    relacao,
    erros,
    erroGeral,
    aviso,
    confirmando,
    alterarNome: setNome,
    alterarTelefone: (t: string) => setTelefone(mascararTelefone(t)),
    escolherRelacao: setRelacao,
    enviar,
    salvando: salvar.isPending,
    removerAgora,
    removendo: remover.isPending,
    erroRemover: remover.isError ? mensagem(remover.error) : null,
    pedirRemocao: () => setConfirmando(true),
    fecharRemocao: () => {
      setConfirmando(false);
      remover.reset();
    },
    reenviarConvite: (idGuardia: string) =>
      reenviar.mutate(idGuardia, { onSuccess: () => setAviso('Convite reenviado.'), onError: (err) => setErroGeral(mensagem(err)) }),
    reenviando: reenviar.isPending,
  };
}
