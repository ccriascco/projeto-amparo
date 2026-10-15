import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, type TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiUsuarias } from '@/services/api/endpoints';
import { ErroApi } from '@/services/api/erros';
import { BotaoGoogle } from '@/views/components/dominio/BotaoGoogle';
import { Botao } from '@/views/components/ui/Botao';
import { Campo } from '@/views/components/ui/Campo';
import { Texto } from '@/views/components/ui/Texto';
import { useRascunhoCadastro } from '@/models/stores/rascunhoCadastro';
import { useSessao } from '@/models/stores/sessao';
import { useTema } from '@/views/theme/tema';
import { fixas, fontes, raios } from '@/views/theme/tokens';
import { obterIdTokenGoogle } from '@/services/google';
import { emailValido } from '@/utils/validacao/regras';

export default function TelaLogin() {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const entrar = useSessao((s) => s.entrar);
  const definirGoogle = useRascunhoCadastro((s) => s.definirGoogle);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erroEmail, setErroEmail] = useState<string | null>(null);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const campoSenha = useRef<TextInput>(null);

  const login = useMutation({
    mutationFn: () => apiUsuarias.login(email.trim(), senha),
    onSuccess: (r) => entrar(r),
    onError: (e) => {
      if (e instanceof ErroApi && e.status === 401) setErroSenha('E-mail ou senha incorretos. Confira e tente de novo.');
      else setErroGeral(e instanceof ErroApi ? e.mensagem : 'Algo deu errado. Tente de novo.');
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
    onError: (e) => setErroGeral(e instanceof ErroApi ? e.mensagem : 'Não foi possível entrar com o Google.'),
  });

  const enviar = () => {
    setErroGeral(null);
    const eOk = emailValido(email);
    setErroEmail(eOk ? null : 'Esse e-mail não parece válido. Confira e tente de novo.');
    setErroSenha(senha ? null : 'Digite sua senha.');
    if (eOk && senha) login.mutate();
  };

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
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setErroEmail(null);
                  }}
                  erro={erroEmail}
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
                  value={senha}
                  onChangeText={(t) => {
                    setSenha(t);
                    setErroSenha(null);
                  }}
                  erro={erroSenha}
                  secureTextEntry
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={enviar}
                  testID="login-senha"
                />
              </View>
              <View style={{ gap: 16, alignItems: 'center' }}>
                <Botao onPress={enviar} carregando={login.isPending} estilo={{ alignSelf: 'stretch' }} testID="login-enviar">
                  Fazer Login
                </Botao>
                {erroGeral ? (
                  <Texto variante="nota" corLivre={fixas.sos} centro accessibilityLiveRegion="polite">
                    {erroGeral}
                  </Texto>
                ) : null}
                <Pressable onPress={() => router.replace('/cadastro')} accessibilityRole="link" hitSlop={8}>
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
              <BotaoGoogle onPress={() => google.mutate()} carregando={google.isPending} />
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
