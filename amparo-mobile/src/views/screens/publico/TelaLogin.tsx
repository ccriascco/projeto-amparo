import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, type TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTelaLogin } from '@/controllers/telas/publico/useTelaLogin';
import { BotaoGoogle } from '@/views/components/dominio/BotaoGoogle';
import { Botao } from '@/views/components/ui/Botao';
import { Campo } from '@/views/components/ui/Campo';
import { Texto } from '@/views/components/ui/Texto';
import { useTema } from '@/views/theme/tema';
import { fixas, fontes, raios } from '@/views/theme/tokens';

export default function TelaLogin() {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const c = useTelaLogin();
  const campoSenha = useRef<TextInput>(null);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={fixas.gradienteHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={{ minHeight: 240, paddingTop: Math.max(insets.top, 32), paddingHorizontal: 32, paddingBottom: 24, gap: 16, justifyContent: 'flex-end' }}>
            <Image source={require('@/assets/images/logo.png')} contentFit="contain" style={{ width: 157, height: 45 }} accessibilityLabel="Amparo" />
            <View style={{ gap: 4 }}>
              <Texto accessibilityRole="header" corLivre="#FFFFFF" style={{ fontFamily: fontes.display[700], fontSize: 31, lineHeight: 37 }}>
                Bem vindo a Amparo
              </Texto>
              <Texto variante="subtitulo" corLivre="rgba(255,255,255,0.8)">
                Acesse sua conta para continuar.
              </Texto>
            </View>
          </View>

          <View
            style={{
              flex: 1,
              marginTop: 8,
              borderTopLeftRadius: raios.sheet,
              borderTopRightRadius: raios.sheet,
              backgroundColor: cores.tela,
              boxShadow: '0 -8px 16px rgba(0,0,0,0.1)',
              paddingTop: 24,
              paddingHorizontal: 32,
              paddingBottom: 32 + insets.bottom,
              justifyContent: 'space-between',
              gap: 32,
            }}
          >
            <View style={{ gap: 24 }}>
              <View style={{ gap: 16 }}>
                <Campo
                  rotulo="Email"
                  placeholder="teste@gmail.com"
                  value={c.email}
                  onChangeText={c.alterarEmail}
                  erro={c.erroEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={() => campoSenha.current?.focus()}
                  testID="login-email"
                />
                <Campo
                  ref={campoSenha}
                  rotulo="Senha"
                  placeholder="Sua senha"
                  value={c.senha}
                  onChangeText={c.alterarSenha}
                  erro={c.erroSenha}
                  secureTextEntry
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={c.enviar}
                  testID="login-senha"
                />
              </View>
              <View style={{ gap: 16, alignItems: 'center' }}>
                <Botao onPress={c.enviar} carregando={c.entrando} estilo={{ alignSelf: 'stretch' }} testID="login-enviar">
                  Fazer Login
                </Botao>
                {c.erroGeral ? (
                  <Texto variante="nota" corLivre={fixas.sos} centro accessibilityLiveRegion="polite">
                    {c.erroGeral}
                  </Texto>
                ) : c.senhaAlterada ? (
                  <Texto variante="nota" corLivre={cores.verde} centro accessibilityLiveRegion="polite">
                    Senha alterada. Entre com a nova senha.
                  </Texto>
                ) : null}
                <Pressable onPress={c.esqueciSenha} accessibilityRole="link" hitSlop={8}>
                  <Texto peso={700} corLivre={cores.nota} style={{ lineHeight: 18 }}>
                    Esqueceu a Senha?
                  </Texto>
                </Pressable>
                <Pressable onPress={c.irParaCadastro} accessibilityRole="link" hitSlop={8}>
                  <Texto corLivre={cores.nota} style={{ lineHeight: 18 }}>
                    Ainda não tem conta? Clique aqui
                  </Texto>
                </Pressable>
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: cores.borda20 }} />
                <Texto variante="cardCorpo" cor="textoSecundario">
                  Continue
                </Texto>
                <View style={{ flex: 1, height: 1, backgroundColor: cores.borda20 }} />
              </View>
              <BotaoGoogle onPress={c.entrarComGoogle} carregando={c.entrandoComGoogle} />
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
