import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiUsuarias } from '@/services/api/endpoints';
import { ErroApi } from '@/services/api/erros';
import type { DadosCadastro } from '@/models/tipos';
import { ChecklistSenha } from '@/views/components/dominio/ChecklistSenha';
import { BarraEtapas, BotaoVoltar, NotaCadeado } from '@/views/components/ui/Basicos';
import { Botao } from '@/views/components/ui/Botao';
import { Campo } from '@/views/components/ui/Campo';
import { CartaoEscolha } from '@/views/components/ui/CartaoEscolha';
import { CirculoIcone, CartaoInfo } from '@/views/components/ui/Cartao';
import { EntradaPin } from '@/views/components/ui/EntradaPin';
import { Icone } from '@/views/components/ui/Icone';
import { Texto } from '@/views/components/ui/Texto';
import { useRascunhoCadastro } from '@/models/stores/rascunhoCadastro';
import { useSessao } from '@/models/stores/sessao';
import { useTema } from '@/views/theme/tema';
import { fixas, raios } from '@/views/theme/tokens';
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

const TOTAL = 8;
type Guardia = { nome: string; telefone: string };
type Erros = Record<string, string | null>;

function Cabecalho({ titulo, sub, tamanho = 31 }: { titulo: string; sub: string; tamanho?: number }) {
  return (
    <View style={{ gap: 4 }}>
      <Texto accessibilityRole="header" peso={700} tamanho={tamanho} style={{ lineHeight: Math.round(tamanho * 1.2) }}>
        {titulo}
      </Texto>
      <Texto variante="subtitulo">{sub}</Texto>
    </View>
  );
}

export default function TelaCadastro() {
  const { cores, sombraCard } = useTema();
  const insets = useSafeAreaInsets();
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
        setErroEnvio(e instanceof ErroApi ? e.mensagem : 'Não foi possível concluir o cadastro. Tente de novo.');
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
    if (etapa < TOTAL) return setEtapa(proxima(etapa + 1));
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

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: cores.tela }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, paddingTop: Math.max(insets.top + 16, 48), paddingHorizontal: 32, paddingBottom: 32 + insets.bottom, gap: 32 }}>
        <View style={{ gap: 8 }}>
          <View style={{ height: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <BotaoVoltar onPress={voltar} />
            <Texto peso={500} cor="nota" style={{ lineHeight: 18 }}>{`Etapa ${etapa}/${TOTAL}`}</Texto>
          </View>
          <BarraEtapas atual={etapa} total={TOTAL} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 24 }} keyboardShouldPersistTaps="handled">
          {etapa === 1 ? (
            <>
              <Cabecalho titulo="Um pouco sobre você" sub="Esses dados ficam associados à sua conta. Você pode alterá-los a qualquer momento" />
              <View style={{ gap: 16 }}>
                <Campo rotulo="Nome completo" placeholder="Digite seu nome" value={nome} onChangeText={setNome} erro={erros.nome} autoComplete="name" textContentType="name" />
                <Campo
                  rotulo="Data de Nascimento"
                  placeholder="00/00/0000"
                  value={nascimento}
                  onChangeText={(t) => setNascimento(mascararData(t))}
                  erro={erros.nascimento}
                  keyboardType="number-pad"
                />
                <Campo
                  rotulo="Telefone"
                  placeholder="(00) 00000-0000"
                  value={telefone}
                  onChangeText={(t) => setTelefone(mascararTelefone(t))}
                  erro={erros.telefone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
              </View>
              <NotaCadeado>Nunca enviamos SMS ou notificações visíveis para o número informado sem sua ação direta.</NotaCadeado>
            </>
          ) : null}

          {etapa === 2 ? (
            <>
              <Cabecalho titulo="Qual é o seu CPF?" sub="Precisamos do seu CPF para validar sua conta." />
              <Campo rotulo="CPF" placeholder="000.000.000-00" value={cpf} onChangeText={(t) => setCpf(mascararCpf(t))} erro={erros.cpf} keyboardType="number-pad" />
              <NotaCadeado>Seu CPF é usado só para validar a conta. Ele nunca aparece para suas guardiãs.</NotaCadeado>
            </>
          ) : null}

          {etapa === 3 ? (
            <>
              <Cabecalho titulo="Qual é o seu e-mail" sub="Use um e-mail que só você acessa. É com ele que você vai entrar no app." />
              <Campo
                rotulo="E-mail"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChangeText={setEmail}
                erro={erros.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                desabilitado={!!google}
                nota={google ? 'E-mail da sua conta Google.' : undefined}
              />
              <NotaCadeado>Recomendamos um e-mail que o agressor não tenha acesso. Evite contas compartilhadas.</NotaCadeado>
            </>
          ) : null}

          {etapa === 4 ? (
            <>
              <Cabecalho titulo="Crie uma senha" sub="Essa é a senha que você vai usar para entrar com seu e-mail." />
              <Campo rotulo="Senha" placeholder="Crie sua senha" value={senha} onChangeText={setSenha} erro={erros.senha} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
              <NotaCadeado>Sua senha passa por criptografia e fica protegida em nosso sistema. Nenhuma pessoa, consegue visualizá-la</NotaCadeado>
              <ChecklistSenha senha={senha} />
            </>
          ) : null}

          {etapa === 5 ? (
            <>
              <CirculoIcone nome="map-pin" tamanho={64} tamanhoIcone={32} />
              <Cabecalho titulo="Permitir localização" sub="Isso é usado apenas quando você aciona uma função específica dentro do app." />
              <View style={{ height: 180, borderRadius: raios.card, overflow: 'hidden', borderWidth: 1, borderColor: cores.borda10 }}>
                <Image source={require('@/assets/images/mapa-previa.png')} contentFit="cover" style={{ width: '100%', height: '100%' }} accessibilityLabel="Prévia do mapa" />
                <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <Icone nome="map-pin" tamanho={32} cor={cores.acento} />
                </View>
              </View>
              <NotaCadeado>Sua localização nunca é compartilhada continuamente, apenas no momento em que você decide usá-la.</NotaCadeado>
            </>
          ) : null}

          {etapa === 6 ? (
            <>
              <Cabecalho titulo="Notificações e câmera" sub="Elas ajudam o app a funcionar melhor no seu dia a dia. Você pode desativar quando quiser." />
              <View style={{ gap: 16 }}>
                <CartaoInfo icone="bell" titulo="Notificações" corpo="Usadas para avisos discretos, sem detalhes visíveis na tela de bloqueio." />
                <CartaoInfo icone="camera" titulo="Câmera e áudio" corpo="Usados apenas quando você decide gravar ou fotografar algo dentro do app." />
              </View>
              <NotaCadeado>Você pode ativar ou desativar qualquer uma dessas permissões quando quiser, nas configurações do app.</NotaCadeado>
            </>
          ) : null}

          {etapa === 7 && !pinAberto ? (
            <>
              <CirculoIcone nome="shield-check" tamanho={64} tamanhoIcone={32} />
              <Cabecalho titulo="Quer disfarçar o app?" sub="O Modo Disfarce transforma o app em uma calculadora comum e funcional." />
              <View style={{ gap: 16 }} accessibilityRole="radiogroup">
                <View style={{ gap: 8 }}>
                  <View style={{ alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, backgroundColor: cores.borda10 }}>
                    <Texto peso={700} tamanho={12} cor="acento" style={{ letterSpacing: -0.24, lineHeight: 16 }}>
                      Recomendado
                    </Texto>
                  </View>
                  <CartaoEscolha
                    titulo="Ativar Modo Disfarce"
                    corpo="O app terá o ícone e o nome de uma calculadora comum."
                    selecionado={disfarce === 'ativar'}
                    onPress={() => setDisfarce('ativar')}
                  />
                </View>
                <CartaoEscolha
                  titulo="Manter Modo Padrão"
                  corpo="Manter o ícone e a marca oficial do Amparo visíveis na sua tela inicial."
                  selecionado={disfarce === 'padrao'}
                  onPress={() => setDisfarce('padrao')}
                />
              </View>
              <NotaCadeado>Você pode ativar ou desativar qualquer uma dessas permissões quando quiser, nas configurações do app.</NotaCadeado>
            </>
          ) : null}

          {etapa === 7 && pinAberto ? (
            <View style={{ gap: 16 }}>
              <Cabecalho
                titulo="Defina sua senha de acesso"
                sub={'Você vai digitar esses quatro números na calculadora e apertar "=" para destravar a área protegida do app.'}
                tamanho={25}
              />
              <EntradaPin rotulo="Senha de 4 dígitos" valor={pin} aoMudar={setPin} autoFocus testID="pin" />
              <View style={{ gap: 8 }}>
                <EntradaPin rotulo="Digite de novo para confirmar" valor={pinConf} aoMudar={setPinConf} erro={pinDivergente} testID="pin-conf" />
                <Texto variante="nota" corLivre={pinDivergente ? cores.sair : pinOk ? cores.verde : cores.nota} accessibilityLiveRegion="polite">
                  {pinDivergente ? 'Os dois números não são iguais. Confira e digite de novo.' : pinOk ? 'Senha definida.' : 'Use quatro números que você lembre com facilidade.'}
                </Texto>
              </View>
            </View>
          ) : null}

          {etapa === 8 ? (
            <>
              <Cabecalho titulo="Cadastre sua rede de apoio" sub="Adicione pelo menos 1 pessoa de confiança — ela será avisada em situações de risco." />
              <View style={{ gap: 16 }}>
                {guardioes.map((g, i) => (
                  <View
                    key={i}
                    style={{ gap: 16, padding: 20, borderWidth: 1, borderColor: cores.borda10, borderRadius: raios.card, backgroundColor: cores.card, ...sombraCard }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Texto peso={600} tamanho={14} cor="acento">
                        {i === 0 ? 'Guardiã principal' : `Guardiã ${i + 1}`}
                      </Texto>
                      {i > 0 ? (
                        <Pressable
                          onPress={() => setGuardioes((l) => l.filter((_, j) => j !== i))}
                          accessibilityRole="button"
                          accessibilityLabel={`Remover guardiã ${i + 1}`}
                          hitSlop={8}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Icone nome="x" tamanho={16} cor={cores.nota} />
                          <Texto variante="nota">Remover</Texto>
                        </Pressable>
                      ) : null}
                    </View>
                    <Campo rotulo="Nome" placeholder="Como você chama essa pessoa" value={g.nome} onChangeText={(t) => atualizarGuardia(i, 'nome', t)} erro={erros[`gnome${i}`]} />
                    <Campo
                      rotulo="Telefone"
                      placeholder="(00) 00000-0000"
                      value={g.telefone}
                      onChangeText={(t) => atualizarGuardia(i, 'telefone', mascararTelefone(t))}
                      erro={erros[`gtel${i}`]}
                      keyboardType="phone-pad"
                    />
                  </View>
                ))}
                {guardioes.length < 5 ? (
                  <Pressable
                    onPress={() => setGuardioes((l) => [...l, { nome: '', telefone: '' }])}
                    accessibilityRole="button"
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      height: 48,
                      borderRadius: 999,
                      borderWidth: 1.5,
                      borderStyle: 'dashed',
                      borderColor: cores.borda40,
                    }}
                  >
                    <Icone nome="plus" tamanho={20} cor={cores.acento} />
                    <Texto variante="rotulo">Adicionar guardiã</Texto>
                  </Pressable>
                ) : null}
              </View>
              <NotaCadeado alinharTopo>
                {`Elas só recebem um aviso quando você aciona o pedido de ajuda. Nunca contamos que o Amparo está no seu celular. Você adicionou ${guardioes.length} de 5.`}
              </NotaCadeado>
            </>
          ) : null}
        </ScrollView>

        <View style={{ gap: 8 }}>
          {erroEnvio ? (
            <Texto variante="nota" corLivre={fixas.sos} centro accessibilityLiveRegion="polite">
              {erroEnvio}
            </Texto>
          ) : null}
          <Botao onPress={avancar} desabilitado={ctaBloqueado} carregando={cadastro.isPending} testID="cadastro-avancar">
            {rotuloCta}
          </Botao>
          {etapa === 5 || etapa === 6 ? (
            <Botao variante="secundario" onPress={pular}>
              Agora Não
            </Botao>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
