import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import type { CanalRecuperacao } from '@/models/tipos';
import { apiUsuarias } from '@/services/api/endpoints';
import { mensagemDeErro } from '@/services/api/erros';
import { emailValido, senhaAtendeRegras } from '@/utils/validacao/regras';

type Erros = { email?: string; codigo?: string; nova?: string; confirmacao?: string };

// "Esqueceu a senha?": 1) e-mail da conta e o canal do código; 2) código de 6 números e a senha nova.
// A tela nunca mostra o e-mail ou o telefone cadastrados, nem diz se a conta existe.
export function useTelaRecuperarSenha() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [email, setEmail] = useState(params.email ?? '');
  const [canal, setCanal] = useState<CanalRecuperacao>('email');
  const [codigo, setCodigo] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const pedido = useMutation({
    mutationFn: () => apiUsuarias.pedirRecuperacao(email.trim(), canal),
    onSuccess: (r) => {
      setAviso(r.mensagem);
      setEtapa(2);
    },
    onError: (e) => setErroGeral(mensagemDeErro(e, 'Não foi possível enviar o código. Tente de novo.')),
  });

  const redefinicao = useMutation({
    mutationFn: () => apiUsuarias.redefinirSenha(email.trim(), codigo, nova),
    onSuccess: () => router.dismissTo({ pathname: '/login', params: { aviso: 'senha-alterada' } }),
    onError: (e) => setErroGeral(mensagemDeErro(e, 'Não foi possível alterar a senha. Tente de novo.')),
  });

  const enviarCodigo = () => {
    setErroGeral(null);
    const ok = emailValido(email);
    setErros({ email: ok ? undefined : 'Esse e-mail não parece válido. Confira e tente de novo.' });
    if (ok) pedido.mutate();
  };

  const redefinir = () => {
    setErroGeral(null);
    const e: Erros = {
      codigo: /^\d{6}$/.test(codigo) ? undefined : 'Digite os 6 números do código.',
      nova: senhaAtendeRegras(nova) ? undefined : 'A nova senha ainda não atende a todas as regras.',
      confirmacao: confirmacao === nova ? undefined : 'As duas senhas não são iguais.',
    };
    setErros(e);
    if (!e.codigo && !e.nova && !e.confirmacao) redefinicao.mutate();
  };

  return {
    etapa,
    email,
    canal,
    codigo,
    nova,
    confirmacao,
    erros,
    erroGeral,
    aviso,
    alterarEmail: (t: string) => {
      setEmail(t);
      setErros((x) => ({ ...x, email: undefined }));
    },
    escolherCanal: setCanal,
    alterarCodigo: (t: string) => {
      setCodigo(t.replace(/\D/g, '').slice(0, 6));
      setErros((x) => ({ ...x, codigo: undefined }));
    },
    alterarNova: setNova,
    alterarConfirmacao: setConfirmacao,
    enviarCodigo,
    enviando: pedido.isPending,
    reenviarCodigo: () => {
      setErroGeral(null);
      pedido.mutate();
    },
    redefinir,
    redefinindo: redefinicao.isPending,
    voltar: () => {
      setErroGeral(null);
      setErros({});
      if (etapa === 2) return setEtapa(1);
      router.back();
    },
  };
}
