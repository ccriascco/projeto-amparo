import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { useAtualizarPerfil, usePerfil } from '@/controllers/dados';
import type { Perfil } from '@/models/tipos';
import { usePreferencias } from '@/models/stores/preferencias';
import { useSessao } from '@/models/stores/sessao';
import { apiUsuarias } from '@/services/api/endpoints';
import { ErroApi, MENSAGEM_CARREGAR, mensagemDeErro } from '@/services/api/erros';
import { obterIdTokenGoogle } from '@/services/google';
import { emailValido, mascararTelefone, somenteDigitos, telefoneValido } from '@/utils/validacao/regras';

/** Minha Conta: carrega o perfil antes de abrir o formulário. */
export function useTelaConta() {
  const perfil = usePerfil();
  return {
    perfil: perfil.data,
    carregando: perfil.isLoading,
    erroCarregar: perfil.isError ? mensagemDeErro(perfil.error, MENSAGEM_CARREGAR) : null,
    tentarDeNovo: () => perfil.refetch(),
  };
}

/** Formulário da conta: dados pessoais, tema, sair e excluir a conta. */
export function useFormularioConta(p: Perfil) {
  const atualizar = useAtualizarPerfil();
  const { tema, definirTema } = usePreferencias();
  const sair = useSessao((s) => s.sair);

  const [nome, setNome] = useState(p.nome_completo);
  const [telefone, setTelefone] = useState(mascararTelefone(p.telefone));
  const [email, setEmail] = useState(p.email);
  const [erros, setErros] = useState<{ nome?: string; telefone?: string; email?: string }>({});
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [senhaExclusao, setSenhaExclusao] = useState('');

  const salvar = () => {
    setMensagem(null);
    const e = {
      nome: nome.trim().length < 2 ? 'Digite seu nome completo.' : undefined,
      telefone: telefoneValido(telefone) ? undefined : 'Digite o telefone com DDD.',
      email: emailValido(email) ? undefined : 'Esse e-mail não parece válido.',
    };
    setErros(e);
    if (e.nome || e.telefone || e.email) return;
    const alteracoes = {
      ...(nome.trim() !== p.nome_completo ? { nome_completo: nome.trim() } : {}),
      ...(somenteDigitos(telefone) !== p.telefone ? { telefone: somenteDigitos(telefone) } : {}),
      ...(email.trim().toLowerCase() !== p.email ? { email: email.trim().toLowerCase() } : {}),
    };
    if (Object.keys(alteracoes).length === 0) return setMensagem({ texto: 'Nada mudou.', erro: false });
    atualizar.mutate(alteracoes, {
      onSuccess: () => setMensagem({ texto: 'Dados salvos.', erro: false }),
      onError: (err) =>
        setMensagem({
          texto: err instanceof ErroApi && err.status === 409 ? 'Esse e-mail já é usado por outra conta.' : mensagemDeErro(err, 'Não foi possível salvar.'),
          erro: true,
        }),
    });
  };

  const exclusao = useMutation({
    mutationFn: async () => {
      if (p.tem_senha) return apiUsuarias.excluirConta({ senha: senhaExclusao });
      const idToken = await obterIdTokenGoogle();
      if (!idToken) throw new ErroApi('cancelado', 0, 'Confirmação cancelada.');
      return apiUsuarias.excluirConta({ google_id_token: idToken });
    },
    onSuccess: () => sair({ avisarServidor: false }),
  });

  return {
    nome,
    telefone,
    email,
    erros,
    mensagem,
    confirmarSaida,
    excluindo,
    senhaExclusao,
    tema,
    alterarNome: setNome,
    alterarTelefone: (t: string) => setTelefone(mascararTelefone(t)),
    alterarEmail: setEmail,
    alterarSenhaExclusao: setSenhaExclusao,
    salvar,
    salvando: atualizar.isPending,
    definirTema,
    abrirSenha: () => router.push('/mais/senha'),
    pedirSaida: () => setConfirmarSaida(true),
    fecharSaida: () => setConfirmarSaida(false),
    sair: () => sair(),
    pedirExclusao: () => setExcluindo(true),
    excluir: () => exclusao.mutate(),
    exclusaoPendente: exclusao.isPending,
    erroExclusao: exclusao.isError ? mensagemDeErro(exclusao.error, 'Não foi possível excluir.') : null,
    fecharExclusao: () => {
      setExcluindo(false);
      setSenhaExclusao('');
      exclusao.reset();
    },
  };
}
