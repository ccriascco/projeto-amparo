import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useAtualizarPerfil, usePerfil } from '@/controllers/dados';
import { mensagemDeErro } from '@/services/api/erros';
import { abrirAjustesDoSistema, pedirCameraEMicrofone, pedirLocalizacao, situacaoPermissoes } from '@/utils/permissoes';

export type IdPermissao = 'local' | 'camera';

// Modo Disfarce, código de desbloqueio e permissões do sistema.
export function useTelaSeguranca() {
  const perfil = usePerfil();
  const atualizar = useAtualizarPerfil();
  const [perms, setPerms] = useState({ local: false, camera: false });
  const disfarce = perfil.data?.modo_disfarcado ?? false;

  // As permissões são do sistema: o app mostra a situação real e leva aos ajustes para desligar
  useFocusEffect(
    useCallback(() => {
      situacaoPermissoes().then(setPerms).catch(() => undefined);
    }, []),
  );

  const alternarPermissao = async (id: IdPermissao) => {
    if (perms[id]) return abrirAjustesDoSistema();
    const ok = id === 'local' ? await pedirLocalizacao() : await pedirCameraEMicrofone();
    if (!ok) abrirAjustesDoSistema();
    setPerms(await situacaoPermissoes());
  };

  const [confirmandoDisfarce, setConfirmandoDisfarce] = useState(false);

  const trocarDisfarce = () => {
    if (!perfil.data) return;
    if (!disfarce && !perfil.data.codigo_disfarce_definido) {
      router.push({ pathname: '/mais/codigo', params: { motivo: 'disfarce' } });
      return;
    }
    atualizar.mutate({ modo_disfarcado: !disfarce });
  };

  // Ligar avisa antes que o ícone e o nome do app vão mudar; desligar é direto
  const alternarDisfarce = () => {
    if (!perfil.data) return;
    if (!disfarce) return setConfirmandoDisfarce(true);
    trocarDisfarce();
  };

  return {
    disfarce,
    codigoDefinido: !!perfil.data?.codigo_disfarce_definido,
    perms,
    erroDisfarce: atualizar.isError ? mensagemDeErro(atualizar.error, 'Não foi possível mudar o Modo Disfarce.') : null,
    alternarDisfarce,
    confirmandoDisfarce,
    confirmarDisfarce: () => {
      setConfirmandoDisfarce(false);
      trocarDisfarce();
    },
    cancelarDisfarce: () => setConfirmandoDisfarce(false),
    alternarPermissao,
    abrirCodigo: () => router.push('/mais/codigo'),
  };
}
