import { Pressable, View } from 'react-native';

import { voltar } from '@/controllers/navegacao';
import { useFormularioGuardia, useTelaGuardia } from '@/controllers/telas/autenticada/rede/useTelaGuardia';
import { TelaInterna } from '@/views/components/layout/TelaInterna';
import type { Guardia } from '@/models/tipos';
import { Botao } from '@/views/components/ui/Botao';
import { CartaoInfo } from '@/views/components/ui/Cartao';
import { Confirmacao } from '@/views/components/ui/Confirmacao';
import { Carregando } from '@/views/components/ui/Estados';
import { Campo } from '@/views/components/ui/Campo';
import { Texto } from '@/views/components/ui/Texto';
import { useTema } from '@/views/theme/tema';
import { fixas, raios } from '@/views/theme/tokens';
import { haQuantoTempo } from '@/utils/tempoRelativo';

const RELACOES = ['Amigos', 'Família'] as const;

export default function TelaGuardia() {
  const { id, carregando, existente } = useTelaGuardia();
  if (carregando) {
    return (
      <TelaInterna cabecalho={{ titulo: 'Editar guardião', aoFecharTopo: voltar }} semNav>
        <Carregando />
      </TelaInterna>
    );
  }
  return <FormularioGuardia key={existente?.id ?? 'nova'} id={id} existente={existente} />;
}

function FormularioGuardia({ id, existente }: { id?: string; existente?: Guardia }) {
  const { cores } = useTema();
  const { editando, nome, telefone, relacao, erros, erroGeral, aviso, ...c } = useFormularioGuardia({ id, existente });

  return (
    <TelaInterna
      cabecalho={{ titulo: editando ? 'Editar guardião' : 'Adicionar guardião', sub: 'Ela vai receber um convite por mensagem.', aoFecharTopo: voltar }}
      semNav
      sobreposicao={
        <Confirmacao
          visivel={c.confirmando}
          titulo="Remover guardiã?"
          texto={`${nome || 'Ela'} deixa de receber seus pedidos de ajuda.`}
          rotuloConfirmar="Remover"
          aoConfirmar={c.removerAgora}
          aoFechar={c.fecharRemocao}
          carregando={c.removendo}
          erro={c.erroRemover}
        />
      }
    >
      <View style={{ gap: 16 }}>
        <Campo rotulo="Nome completo" placeholder="Como você chama essa pessoa" value={nome} onChangeText={c.alterarNome} erro={erros.nome} />
        <Campo
          rotulo="Telefone"
          placeholder="(00) 00000-0000"
          value={telefone}
          onChangeText={c.alterarTelefone}
          erro={erros.telefone}
          keyboardType="phone-pad"
          nota={editando ? 'Trocar o telefone envia um convite novo.' : undefined}
        />
        <View style={{ gap: 8 }}>
          <Texto variante="rotulo">Relação</Texto>
          <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
            {RELACOES.map((r) => {
              const on = relacao === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => c.escolherRelacao(r)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: raios.pilula,
                    borderWidth: 1,
                    borderColor: on ? cores.acento : cores.borda40,
                    backgroundColor: on ? cores.borda04 : 'transparent',
                  }}
                >
                  <Texto peso={700} tamanho={14} corLivre={on ? cores.acento : cores.textoSuave}>
                    {r}
                  </Texto>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {existente ? (
        existente.status_convite === 'CONFIRMADO' ? (
          <CartaoInfo
            icone="check"
            titulo="Convite confirmado"
            corpo={existente.confirmado_em ? `Ela aceitou ${haQuantoTempo(existente.confirmado_em)}.` : 'Ela aceitou o convite.'}
            corIcone={cores.verde}
            fundoIcone={cores.verde12}
            borda={cores.verde30}
          />
        ) : (
          <CartaoInfo
            icone="clock"
            titulo="Convite pendente"
            corpo={existente.convidado_em ? `Enviado ${haQuantoTempo(existente.convidado_em)}. Ela ainda não confirmou.` : 'Ela ainda não confirmou.'}
          >
            <Botao
              variante="secundario"
              compacto
              estilo={{ alignSelf: 'flex-start' }}
              carregando={c.reenviando}
              onPress={() => c.reenviarConvite(existente.id)}
            >
              Reenviar convite
            </Botao>
          </CartaoInfo>
        )
      ) : null}

      {aviso ? (
        <Texto variante="nota" corLivre={cores.verde} accessibilityLiveRegion="polite">
          {aviso}
        </Texto>
      ) : null}
      {erroGeral ? (
        <Texto variante="nota" corLivre={fixas.sos} accessibilityLiveRegion="polite">
          {erroGeral}
        </Texto>
      ) : null}

      <Botao onPress={c.enviar} carregando={c.salvando} estilo={{ marginTop: 8 }}>
        {editando ? 'Salvar alterações' : 'Salvar guardião'}
      </Botao>
      {editando ? (
        <Botao variante="perigo" onPress={c.pedirRemocao}>
          Remover guardião
        </Botao>
      ) : null}
    </TelaInterna>
  );
}
