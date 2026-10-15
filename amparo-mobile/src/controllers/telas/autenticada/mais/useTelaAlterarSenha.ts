import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { chaves, usePerfil } from '@/controllers/dados';
import { apiUsuarias } from '@/services/api/endpoints';
import { ErroApi, mensagemDeErro } from '@/services/api/erros';
import { senhaAtendeRegras } from '@/utils/validacao/regras';

// Trocar a senha (ou criar, para quem entrou só com o Google).
export function useTelaAlterarSenha() {
  const qc = useQueryClient();
  const perfil = usePerfil();
  const temSenha = perfil.data?.tem_senha !== false;
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<{ atual?: string; nova?: string; confirmacao?: string }>({});

  const trocar = useMutation({
    mutationFn: () => apiUsuarias.trocarSenha(temSenha ? atual : undefined, nova),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chaves.perfil });
      router.back();
    },
    onError: (e) => {
      if (e instanceof ErroApi && e.status === 401) setErros({ atual: 'A senha atual está incorreta.' });
    },
  });

  const enviar = () => {
    const e = {
      atual: temSenha && !atual ? 'Digite a senha de agora.' : undefined,
      nova: senhaAtendeRegras(nova) ? undefined : 'A nova senha ainda não atende a todas as regras.',
      confirmacao: confirmacao === nova ? undefined : 'As duas senhas não são iguais.',
    };
    setErros(e);
    if (!e.atual && !e.nova && !e.confirmacao) trocar.mutate();
  };

  // A senha atual errada aparece no próprio campo; os outros erros, abaixo do formulário
  const erroGeral =
    trocar.isError && !(trocar.error instanceof ErroApi && trocar.error.status === 401)
      ? mensagemDeErro(trocar.error, 'Não foi possível alterar a senha.')
      : null;

  return {
    temSenha,
    atual,
    nova,
    confirmacao,
    erros,
    erroGeral,
    alterarAtual: setAtual,
    alterarNova: setNova,
    alterarConfirmacao: setConfirmacao,
    enviar,
    salvando: trocar.isPending,
  };
}
