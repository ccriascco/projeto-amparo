import {
  NunitoSans_300Light,
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
} from '@expo-google-fonts/nunito-sans';
import { Quicksand_700Bold } from '@expo-google-fonts/quicksand';
import { QueryClient } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useEffectEvent, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { useSessao } from '@/models/stores/sessao';
import { ErroApi } from '@/services/api/erros';
import { aplicarIconeDisfarce } from '@/services/iconeDisfarce';

SplashScreen.preventAutoHideAsync();

function novoClienteQuery() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // 401/403/404 não melhoram tentando de novo
        retry: (falhas, erro) => !(erro instanceof ErroApi && erro.status >= 400 && erro.status < 500) && falhas < 2,
      },
    },
  });
}

/** Abertura do app: fontes, cache de dados, sessão do aparelho, trava ao ir para o fundo e splash. */
export function useInicializacaoApp() {
  const [fontesProntas] = useFonts({
    Quicksand_700Bold,
    NunitoSans_300Light,
    NunitoSans_400Regular,
    NunitoSans_500Medium,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
  });
  const [clienteQuery] = useState(novoClienteQuery);
  const estado = useSessao((s) => s.estado);
  const disfarce = useSessao((s) => s.usuaria?.modo_disfarcado);

  useEffect(() => {
    if (__DEV__) console.log('[APP] tela raiz montada');
    useSessao.getState().iniciar();
    return () => {
      if (__DEV__) console.log('[APP] tela raiz desmontada');
    };
  }, []);

  // Com o Modo Disfarce ligado, sair do app trava de novo na calculadora
  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (s) => {
      if (s === 'background') useSessao.getState().bloquear();
    });
    return () => assinatura.remove();
  }, []);

  // Ao sair da conta, nada do cache da usuária anterior fica no aparelho
  useEffect(() => {
    if (estado === 'deslogada') clienteQuery.clear();
  }, [estado, clienteQuery]);

  // Ícone e nome do app seguem o Modo Disfarce (sem conta conectada, fica como está).
  // No Android a troca acontece quando o app vai para segundo plano: trocar com ele aberto
  // fecha a tela em uso. No iPhone a Apple só deixa trocar com o app aberto, então é na hora.
  const aplicarIcone = useEffectEvent(() => {
    if (disfarce !== undefined) aplicarIconeDisfarce(disfarce);
  });
  useEffect(() => {
    if (Platform.OS !== 'android') aplicarIcone();
  }, [disfarce]);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const assinatura = AppState.addEventListener('change', (s) => {
      if (s === 'background') aplicarIcone();
    });
    return () => assinatura.remove();
  }, []);

  const pronto = fontesProntas && estado !== 'iniciando';
  useEffect(() => {
    if (pronto) SplashScreen.hideAsync();
  }, [pronto]);

  return { pronto, estado, clienteQuery };
}
