import { Pressable, View } from 'react-native';

import { voltar } from '@/controllers/navegacao';
import { type IdPermissao, useTelaSeguranca } from '@/controllers/telas/autenticada/mais/useTelaSeguranca';
import { TelaInterna } from '@/views/components/layout/TelaInterna';
import { Interruptor } from '@/views/components/ui/Basicos';
import { Cartao, CirculoIcone } from '@/views/components/ui/Cartao';
import type { NomeIcone } from '@/views/components/ui/Icone';
import { Texto } from '@/views/components/ui/Texto';
import { fixas } from '@/views/theme/tokens';

type Permissao = { id: IdPermissao; icone: NomeIcone; titulo: string; corpo: string };

// "Notificações" do design não aparece: o app ainda não envia notificações (pendência registrada).
const PERMISSOES: Permissao[] = [
  { id: 'local', icone: 'map-pin', titulo: 'Localização', corpo: 'Enviada só quando você aciona o SOS.' },
  { id: 'camera', icone: 'camera', titulo: 'Câmera, fotos e vídeos e áudio', corpo: 'Para registrar provas direto no cofre.' },
];

export default function TelaSeguranca() {
  const { disfarce, perms, ...c } = useTelaSeguranca();

  return (
    <TelaInterna
      aba="mais"
      cabecalho={{ titulo: 'Configurações de segurança', sub: 'Disfarce, privacidade e o que sai do seu aparelho tudo no seu controle.', aoFecharTopo: voltar }}
    >
      <Cartao
        onPress={c.alternarDisfarce}
        rotuloAcessivel={`Modo Disfarce, ${disfarce ? 'ligado' : 'desligado'}`}
        estilo={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Texto variante="cardTitulo">Modo Disfarce</Texto>
          <Texto variante="cardCorpo">Ao abrir, o app aparece como uma calculadora comum.</Texto>
        </View>
        <Interruptor ligado={disfarce} />
      </Cartao>
      {c.erroDisfarce !== null ? (
        <Texto variante="nota" corLivre={fixas.sos}>
          {c.erroDisfarce}
        </Texto>
      ) : null}

      <Cartao estilo={{ gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Texto variante="cardTitulo">Código de desbloqueio</Texto>
          <Texto variante="cardCorpo">{'Digite seu código de 4 números e toque em "=" na calculadora para abrir o Amparo.'}</Texto>
        </View>
        <Pressable onPress={c.abrirCodigo} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
          <Texto variante="link">{c.codigoDefinido ? 'Alterar código' : 'Criar código'}</Texto>
        </Pressable>
      </Cartao>

      {PERMISSOES.map((p) => (
        <Cartao
          key={p.id}
          onPress={() => c.alternarPermissao(p.id)}
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
