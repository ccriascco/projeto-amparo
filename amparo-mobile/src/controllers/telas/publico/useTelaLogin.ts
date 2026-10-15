import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { useRascunhoCadastro } from '@/models/stores/rascunhoCadastro';
import { useSessao } from '@/models/stores/sessao';
import { apiUsuarias } from '@/services/api/endpoints';
import { ErroApi, mensagemDeErro } from '@/services/api/erros';
import { obterIdTokenGoogle } from '@/services/google';
import { emailValido } from '@/utils/validacao/regras';

// Login por e-mail e senha ou pelo Google. Sem conta no Google, leva ao cadastro já preenchido.
export function useTelaLogin() {
  const entrar = useSessao((s) => s.entrar);
  const definirGoogle = useRascunhoCadastro((s) => s.definirGoogle);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erroEmail, setErroEmail] = useState<string | null>(null);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const login = useMutation({
    mutationFn: () => apiUsuarias.login(email.trim(), senha),
    onSuccess: (r) => entrar(r),
    onError: (e) => {
      if (e instanceof ErroApi && e.status === 401) setErroSenha('E-mail ou senha incorretos. Confira e tente de novo.');
      else setErroGeral(mensagemDeErro(e, 'Algo deu errado. Tente de novo.'));
    },
  });

  const google = useMutation({
    mutationFn: async () => {
      const idToken = await obterIdTokenGoogle();
      if (!idToken) return null;
      try {
        return await apiUsuarias.loginGoogle(idToken);
      } catch (e) {
        if (e instanceof ErroApi && e.status === 404 && e.dados.precisa_cadastro) {
          definirGoogle({ idToken, nome: String(e.dados.nome_completo ?? ''), email: String(e.dados.email ?? '') });
          router.push('/cadastro');
          return null;
        }
        throw e;
      }
    },
    onSuccess: (r) => {
      if (r) entrar(r);
    },
    onError: (e) => setErroGeral(mensagemDeErro(e, 'Não foi possível entrar com o Google.')),
  });

  const enviar = () => {
    setErroGeral(null);
    const eOk = emailValido(email);
    setErroEmail(eOk ? null : 'Esse e-mail não parece válido. Confira e tente de novo.');
    setErroSenha(senha ? null : 'Digite sua senha.');
    if (eOk && senha) login.mutate();
  };

  return {
    email,
    senha,
    erroEmail,
    erroSenha,
    erroGeral,
    alterarEmail: (t: string) => {
      setEmail(t);
      setErroEmail(null);
    },
    alterarSenha: (t: string) => {
      setSenha(t);
      setErroSenha(null);
    },
    enviar,
    entrando: login.isPending,
    entrarComGoogle: () => google.mutate(),
    entrandoComGoogle: google.isPending,
    irParaCadastro: () => router.replace('/cadastro'),
  };
}
