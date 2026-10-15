import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ErroApi } from '@/services/api/erros';
import { TelaInterna } from '@/views/components/layout/TelaInterna';
import { Interruptor } from '@/views/components/ui/Basicos';
import { Cartao, CirculoIcone } from '@/views/components/ui/Cartao';
import type { NomeIcone } from '@/views/components/ui/Icone';
import { Texto } from '@/views/components/ui/Texto';
import { useAtualizarPerfil, usePerfil } from '@/controllers/dados';
import { fixas } from '@/views/theme/tokens';
import { abrirAjustesDoSistema, pedirCameraEMicrofone, pedirLocalizacao, situacaoPermissoes } from '@/utils/permissoes';

type Permissao = { id: 'local' | 'camera'; icone: NomeIcone; titulo: string; corpo: string };

// "Notificações" do design não aparece: o app ainda não envia notificações (pendência registrada).
const PERMISSOES: Permissao[] = [
  { id: 'local', icone: 'map-pin', titulo: 'Localização', corpo: 'Enviada só quando você aciona o SOS.' },
  { id: 'camera', icone: 'camera', titulo: 'Câmera, fotos e vídeos e áudio', corpo: 'Para registrar provas direto no cofre.' },
];

export default function TelaSeguranca() {
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

  const alternarPermissao = async (id: Permissao['id']) => {
    if (perms[id]) return abrirAjustesDoSistema();
    const ok = id === 'local' ? await pedirLocalizacao() : await pedirCameraEMicrofone();
    if (!ok) abrirAjustesDoSistema();
    setPerms(await situacaoPermissoes());
  };

  const alternarDisfarce = () => {
    if (!perfil.data) return;
    if (!disfarce && !perfil.data.codigo_disfarce_definido) {
      router.push({ pathname: '/mais/codigo', params: { motivo: 'disfarce' } });
      return;
    }
    atualizar.mutate({ modo_disfarcado: !disfarce });
  };

  return (
    <TelaInterna
      aba="mais"
      cabecalho={{ titulo: 'Configurações de segurança', sub: 'Disfarce, privacidade e o que sai do seu aparelho tudo no seu controle.', aoFecharTopo: () => router.back() }}
    >
      <Cartao
        onPress={alternarDisfarce}
        rotuloAcessivel={`Modo Disfarce, ${disfarce ? 'ligado' : 'desligado'}`}
        estilo={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Texto variante="cardTitulo">Modo Disfarce</Texto>
          <Texto variante="cardCorpo">No seu celular, o app aparece como uma calculadora comum.</Texto>
        </View>
        <Interruptor ligado={disfarce} />
      </Cartao>
      {atualizar.isError ? (
        <Texto variante="nota" corLivre={fixas.sos}>
          {atualizar.error instanceof ErroApi ? atualizar.error.mensagem : 'Não foi possível mudar o Modo Disfarce.'}
        </Texto>
      ) : null}

      <Cartao estilo={{ gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Texto variante="cardTitulo">Código de desbloqueio</Texto>
          <Texto variante="cardCorpo">{'Digite seu código de 4 números e toque em "=" na calculadora para abrir o Amparo.'}</Texto>
        </View>
        <Pressable onPress={() => router.push('/mais/codigo')} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
          <Texto variante="link">{perfil.data?.codigo_disfarce_definido ? 'Alterar código' : 'Criar código'}</Texto>
        </Pressable>
      </Cartao>

      {PERMISSOES.map((p) => (
        <Cartao
          key={p.id}
          onPress={() => alternarPermissao(p.id)}
          rotuloAcessivel={`${p.titulo}, ${perms[p.id] ? 'permitida' : 'não permitida'}. ${perms[p.id] ? 'Abre os ajustes do sistema para desligar.' : ''}`}
          estilo={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}
        >
          <View style={{ flex: 1, flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
            <CirculoIcone nome={p.icone} />
            <View style={{ flex: 1, gap: 4 }}>
              <Texto variante="cardTitulo">{p.titulo}</Texto>
              <Texto variante="cardCorpo">{p.corpo}</Texto>
            </View>
          </View>
          <Interruptor ligado={perms[p.id]} />
        </Cartao>
      ))}
      <Texto variante="nota">As permissões são do sistema: para desligar uma delas, o app abre os ajustes do celular.</Texto>
    </TelaInterna>
  );
}
