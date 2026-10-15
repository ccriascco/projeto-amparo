import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import type { DadosCadastro } from '@/models/tipos';
import { useRascunhoCadastro } from '@/models/stores/rascunhoCadastro';
import { useSessao } from '@/models/stores/sessao';
import { apiUsuarias } from '@/services/api/endpoints';
import { ErroApi, mensagemDeErro } from '@/services/api/erros';
import { pedirCameraEMicrofone, pedirLocalizacao } from '@/utils/permissoes';
import {
  cpfValido,
  dataNoFuturo,
  dataParaIso,
  emailValido,
  mascararCpf,
  mascararData,
  mascararTelefone,
  senhaAtendeRegras,
  somenteDigitos,
  telefoneValido,
} from '@/utils/validacao/regras';

export const TOTAL_ETAPAS = 8;
type Guardia = { nome: string; telefone: string };
type Erros = Record<string, string | null>;

// Cadastro em 8 etapas: dados, CPF, e-mail, senha (pulada no Google), permissões,
// Modo Disfarce com o código de 4 números e as guardiãs.
export function useTelaCadastro() {
  const entrar = useSessao((s) => s.entrar);
  const google = useRascunhoCadastro((s) => s.google);
  const limparGoogle = useRascunhoCadastro((s) => s.definirGoogle);

  const [etapa, setEtapa] = useState(1);
  const [pinAberto, setPinAberto] = useState(false);
  const [nome, setNome] = useState(google?.nome ?? '');
  const [nascimento, setNascimento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState(google?.email ?? '');
  const [senha, setSenha] = useState('');
  const [disfarce, setDisfarce] = useState<'ativar' | 'padrao'>('ativar');
  const [pin, setPin] = useState('');
  const [pinConf, setPinConf] = useState('');
  const [guardioes, setGuardioes] = useState<Guardia[]>([{ nome: '', telefone: '' }]);
  const [erros, setErros] = useState<Erros>({});
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  // Ao sair do cadastro, o token do Google não fica guardado
  useEffect(() => () => limparGoogle(null), [limparGoogle]);

  const pinOk = pin.length === 4 && pin === pinConf;
  const pinDivergente = pinConf.length === 4 && pin !== pinConf;

  const cadastro = useMutation({
    mutationFn: () => {
      const dados: DadosCadastro = {
        cpf: somenteDigitos(cpf),
        email: email.trim().toLowerCase(),
        telefone: somenteDigitos(telefone),
        nome_completo: nome.trim(),
        data_nascimento: dataParaIso(nascimento) ?? '',
        modo_disfarcado: disfarce === 'ativar',
        guardioes: guardioes.map((g) => ({ nome_completo: g.nome.trim(), telefone: somenteDigitos(g.telefone) })),
      };
      if (google) dados.google_id_token = google.idToken;
      else dados.senha = senha;
      if (disfarce === 'ativar') dados.codigo_disfarce = pin;
      return apiUsuarias.cadastrar(dados);
    },
    onSuccess: (r) => entrar(r, disfarce === 'ativar' ? pin : undefined),
    onError: (e) => {
      if (e instanceof ErroApi && e.status === 409) {
        setErroEnvio('Já existe uma conta com este CPF ou e-mail. Entre com ela ou confira os dados.');
      } else {
        setErroEnvio(mensagemDeErro(e, 'Não foi possível concluir o cadastro. Tente de novo.'));
      }
    },
  });

  const validar = (): boolean => {
    const e: Erros = {};
    if (etapa === 1) {
      if (nome.trim().length < 2) e.nome = 'Digite seu nome completo.';
      const iso = dataParaIso(nascimento);
      if (!iso) e.nascimento = 'Confira a data (dia/mês/ano).';
      else if (dataNoFuturo(iso)) e.nascimento = 'A data de nascimento não pode estar no futuro.';
      if (!telefoneValido(telefone)) e.telefone = 'Digite o telefone com DDD.';
    }
    if (etapa === 2 && !cpfValido(cpf)) e.cpf = 'CPF inválido. Confira os números informados.';
    if (etapa === 3 && !emailValido(email)) e.email = 'Esse e-mail não parece válido. Confira e tente de novo.';
    if (etapa === 4 && !senhaAtendeRegras(senha)) e.senha = 'A senha ainda não atende a todas as regras abaixo.';
    if (etapa === 8) {
      guardioes.forEach((g, i) => {
        if (g.nome.trim().length < 2) e[`gnome${i}`] = 'Digite o nome dela.';
        if (!telefoneValido(g.telefone)) e[`gtel${i}`] = 'Digite o telefone com DDD.';
      });
      const tels = guardioes.map((g) => somenteDigitos(g.telefone));
      tels.forEach((t, i) => {
        if (t && tels.indexOf(t) !== i) e[`gtel${i}`] = 'Esse telefone já está na lista.';
      });
    }
    setErros(e);
    return Object.values(e).every((v) => !v);
  };

  const proxima = (n: number) => (n === 4 && google ? 5 : n);
  const anterior = (n: number) => (n === 4 && google ? 3 : n);

  const avancar = async () => {
    if (!validar()) return;
    if (etapa === 5) await pedirLocalizacao().catch(() => false);
    if (etapa === 6) await pedirCameraEMicrofone().catch(() => false);
    if (etapa === 7 && disfarce === 'ativar' && !pinAberto) return setPinAberto(true);
    if (etapa === 7 && pinAberto) {
      if (!pinOk) return;
      setPinAberto(false);
      return setEtapa(8);
    }
    if (etapa < TOTAL_ETAPAS) return setEtapa(proxima(etapa + 1));
    setErroEnvio(null);
    cadastro.mutate();
  };

  const pular = () => setEtapa(etapa + 1);

  const voltar = () => {
    setErros({});
    if (etapa === 7 && pinAberto) return setPinAberto(false);
    if (etapa === 8 && disfarce === 'ativar') {
      setEtapa(7);
      return setPinAberto(true);
    }
    if (etapa > 1) return setEtapa(anterior(etapa - 1));
    router.back();
  };

  const rotuloCta = etapa === 5 ? 'Permitir Localização' : etapa === 6 ? 'Permitir Notificação e Camera' : etapa === 8 ? 'Concluir cadastro' : 'Continuar';
  const ctaBloqueado = etapa === 7 && pinAberto && !pinOk;

  const atualizarGuardia = (i: number, campo: keyof Guardia, valor: string) =>
    setGuardioes((lista) => lista.map((g, j) => (j === i ? { ...g, [campo]: valor } : g)));

  return {
    google,
    etapa,
    pinAberto,
    nome,
    nascimento,
    telefone,
    cpf,
    email,
    senha,
    disfarce,
    pin,
    pinConf,
    guardioes,
    erros,
    erroEnvio,
    pinOk,
    pinDivergente,
    rotuloCta,
    ctaBloqueado,
    enviando: cadastro.isPending,
    alterarNome: setNome,
    alterarNascimento: (t: string) => setNascimento(mascararData(t)),
    alterarTelefone: (t: string) => setTelefone(mascararTelefone(t)),
    alterarCpf: (t: string) => setCpf(mascararCpf(t)),
    alterarEmail: setEmail,
    alterarSenha: setSenha,
    escolherDisfarce: setDisfarce,
    alterarPin: setPin,
    alterarPinConf: setPinConf,
    alterarNomeGuardia: (i: number, t: string) => atualizarGuardia(i, 'nome', t),
    alterarTelefoneGuardia: (i: number, t: string) => atualizarGuardia(i, 'telefone', mascararTelefone(t)),
    removerGuardia: (i: number) => setGuardioes((l) => l.filter((_, j) => j !== i)),
    adicionarGuardia: () => setGuardioes((l) => [...l, { nome: '', telefone: '' }]),
    avancar,
    pular,
    voltar,
  };
}
