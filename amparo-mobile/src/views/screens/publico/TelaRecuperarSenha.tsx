import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTelaRecuperarSenha } from '@/controllers/telas/publico/useTelaRecuperarSenha';
import { ChecklistSenha } from '@/views/components/dominio/ChecklistSenha';
import { BotaoVoltar, NotaCadeado } from '@/views/components/ui/Basicos';
import { Botao } from '@/views/components/ui/Botao';
import { CabecalhoEtapa } from '@/views/components/ui/CabecalhoEtapa';
import { Campo } from '@/views/components/ui/Campo';
import { CartaoEscolha } from '@/views/components/ui/CartaoEscolha';
import { Texto } from '@/views/components/ui/Texto';
import { useTema } from '@/views/theme/tema';
import { fixas } from '@/views/theme/tokens';

// "Esqueceu a senha?" no mesmo estilo do cadastro. Não há tela no design: segue os componentes dele.
export default function TelaRecuperarSenha() {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const c = useTelaRecuperarSenha();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: cores.tela }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, paddingTop: Math.max(insets.top + 16, 48), paddingHorizontal: 32, paddingBottom: 32 + insets.bottom, gap: 32 }}>
        <View style={{ height: 24, justifyContent: 'center' }}>
          <BotaoVoltar onPress={c.voltar} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 24 }} keyboardShouldPersistTaps="handled">
          {c.etapa === 1 ? (
            <>
              <CabecalhoEtapa
                titulo="Esqueceu a senha?"
                sub="Digite o e-mail da sua conta e escolha como quer receber um código para criar uma senha nova."
              />
              <Campo
                rotulo="E-mail"
                placeholder="seuemail@exemplo.com"
                value={c.email}
                onChangeText={c.alterarEmail}
                erro={c.erros.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
              />
              <View style={{ gap: 12 }}>
                <Texto variante="rotulo">Receber o código por</Texto>
                <View style={{ gap: 12 }} accessibilityRole="radiogroup">
                  <CartaoEscolha titulo="E-mail" corpo="No e-mail da sua conta." selecionado={c.canal === 'email'} onPress={() => c.escolherCanal('email')} />
                  <CartaoEscolha titulo="SMS" corpo="No telefone cadastrado na sua conta." selecionado={c.canal === 'sms'} onPress={() => c.escolherCanal('sms')} />
                </View>
              </View>
              <NotaCadeado>A mensagem não cita o Amparo: chega como um código de verificação comum.</NotaCadeado>
            </>
          ) : (
            <>
              <CabecalhoEtapa titulo="Digite o código" sub={c.aviso ?? ''} />
              <Campo
                rotulo="Código"
                placeholder="000000"
                value={c.codigo}
                onChangeText={c.alterarCodigo}
                erro={c.erros.codigo}
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
              />
              <Campo
                rotulo="Nova senha"
                placeholder="Crie a nova senha"
                value={c.nova}
                onChangeText={c.alterarNova}
                erro={c.erros.nova}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <Campo
                rotulo="Confirmar nova senha"
                placeholder="Repita a nova senha"
                value={c.confirmacao}
                onChangeText={c.alterarConfirmacao}
                erro={c.erros.confirmacao}
                secureTextEntry
              />
              <ChecklistSenha senha={c.nova} />
              <NotaCadeado>Depois da troca, todos os aparelhos conectados à sua conta precisam entrar de novo.</NotaCadeado>
              <Pressable onPress={c.reenviarCodigo} disabled={c.enviando} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-start' }}>
                <Texto variante="link">{c.enviando ? 'Enviando…' : 'Não recebeu? Enviar outro código'}</Texto>
              </Pressable>
            </>
          )}
        </ScrollView>

        <View style={{ gap: 8 }}>
          {c.erroGeral ? (
            <Texto variante="nota" corLivre={fixas.sos} centro accessibilityLiveRegion="polite">
              {c.erroGeral}
            </Texto>
          ) : null}
          {c.etapa === 1 ? (
            <Botao onPress={c.enviarCodigo} carregando={c.enviando} testID="recuperar-enviar">
              Enviar código
            </Botao>
          ) : (
            <Botao onPress={c.redefinir} carregando={c.redefinindo} testID="recuperar-salvar">
              Salvar nova senha
            </Botao>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
