import { Image } from 'expo-image';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TOTAL_ETAPAS, useTelaCadastro } from '@/controllers/telas/publico/useTelaCadastro';
import { ChecklistSenha } from '@/views/components/dominio/ChecklistSenha';
import { BarraEtapas, BotaoVoltar, NotaCadeado } from '@/views/components/ui/Basicos';
import { Botao } from '@/views/components/ui/Botao';
import { Campo } from '@/views/components/ui/Campo';
import { CartaoEscolha } from '@/views/components/ui/CartaoEscolha';
import { CirculoIcone, CartaoInfo } from '@/views/components/ui/Cartao';
import { EntradaPin } from '@/views/components/ui/EntradaPin';
import { Icone } from '@/views/components/ui/Icone';
import { Texto } from '@/views/components/ui/Texto';
import { useTema } from '@/views/theme/tema';
import { fixas, raios } from '@/views/theme/tokens';

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
  const {
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
    ...c
  } = useTelaCadastro();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: cores.tela }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, paddingTop: Math.max(insets.top + 16, 48), paddingHorizontal: 32, paddingBottom: 32 + insets.bottom, gap: 32 }}>
        <View style={{ gap: 8 }}>
          <View style={{ height: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <BotaoVoltar onPress={c.voltar} />
            <Texto peso={500} cor="nota" style={{ lineHeight: 18 }}>{`Etapa ${etapa}/${TOTAL_ETAPAS}`}</Texto>
          </View>
          <BarraEtapas atual={etapa} total={TOTAL_ETAPAS} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 24 }} keyboardShouldPersistTaps="handled">
          {etapa === 1 ? (
            <>
              <Cabecalho titulo="Um pouco sobre você" sub="Esses dados ficam associados à sua conta. Você pode alterá-los a qualquer momento" />
              <View style={{ gap: 16 }}>
                <Campo rotulo="Nome completo" placeholder="Digite seu nome" value={nome} onChangeText={c.alterarNome} erro={erros.nome} autoComplete="name" textContentType="name" />
                <Campo
                  rotulo="Data de Nascimento"
                  placeholder="00/00/0000"
                  value={nascimento}
                  onChangeText={c.alterarNascimento}
                  erro={erros.nascimento}
                  keyboardType="number-pad"
                />
                <Campo
                  rotulo="Telefone"
                  placeholder="(00) 00000-0000"
                  value={telefone}
                  onChangeText={c.alterarTelefone}
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
              <Campo rotulo="CPF" placeholder="000.000.000-00" value={cpf} onChangeText={c.alterarCpf} erro={erros.cpf} keyboardType="number-pad" />
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
                onChangeText={c.alterarEmail}
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
              <Campo rotulo="Senha" placeholder="Crie sua senha" value={senha} onChangeText={c.alterarSenha} erro={erros.senha} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
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
                    onPress={() => c.escolherDisfarce('ativar')}
                  />
                </View>
                <CartaoEscolha
                  titulo="Manter Modo Padrão"
                  corpo="Manter o ícone e a marca oficial do Amparo visíveis na sua tela inicial."
                  selecionado={disfarce === 'padrao'}
                  onPress={() => c.escolherDisfarce('padrao')}
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
              <EntradaPin rotulo="Senha de 4 dígitos" valor={pin} aoMudar={c.alterarPin} autoFocus testID="pin" />
              <View style={{ gap: 8 }}>
                <EntradaPin rotulo="Digite de novo para confirmar" valor={pinConf} aoMudar={c.alterarPinConf} erro={pinDivergente} testID="pin-conf" />
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
                          onPress={() => c.removerGuardia(i)}
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
                    <Campo rotulo="Nome" placeholder="Como você chama essa pessoa" value={g.nome} onChangeText={(t) => c.alterarNomeGuardia(i, t)} erro={erros[`gnome${i}`]} />
                    <Campo
                      rotulo="Telefone"
                      placeholder="(00) 00000-0000"
                      value={g.telefone}
                      onChangeText={(t) => c.alterarTelefoneGuardia(i, t)}
                      erro={erros[`gtel${i}`]}
                      keyboardType="phone-pad"
                    />
                  </View>
                ))}
                {guardioes.length < 5 ? (
                  <Pressable
                    onPress={c.adicionarGuardia}
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
          <Botao onPress={c.avancar} desabilitado={ctaBloqueado} carregando={c.enviando} testID="cadastro-avancar">
            {rotuloCta}
          </Botao>
          {etapa === 5 || etapa === 6 ? (
            <Botao variante="secundario" onPress={c.pular}>
              Agora Não
            </Botao>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
