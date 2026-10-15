import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ErroApi } from '@/services/api/erros';
import { TelaInterna } from '@/views/components/layout/TelaInterna';
import type { Guardia } from '@/models/tipos';
import { Botao } from '@/views/components/ui/Botao';
import { CartaoInfo } from '@/views/components/ui/Cartao';
import { Confirmacao } from '@/views/components/ui/Confirmacao';
import { Carregando } from '@/views/components/ui/Estados';
import { Campo } from '@/views/components/ui/Campo';
import { Texto } from '@/views/components/ui/Texto';
import { useGuardioes, useReenviarConvite, useRemoverGuardia, useSalvarGuardia } from '@/controllers/dados';
import { useTema } from '@/views/theme/tema';
import { fixas, raios } from '@/views/theme/tokens';
import { haQuantoTempo } from '@/utils/tempoRelativo';
import { mascararTelefone, somenteDigitos, telefoneValido } from '@/utils/validacao/regras';

const RELACOES = ['Amigos', 'Família'] as const;

export default function TelaGuardia() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const guardioes = useGuardioes();
  if (id && guardioes.isLoading) {
    return (
      <TelaInterna cabecalho={{ titulo: 'Editar guardião', aoFecharTopo: () => router.back() }} semNav>
        <Carregando />
      </TelaInterna>
    );
  }
  const existente = id ? guardioes.data?.find((g) => g.id === id) : undefined;
  return <FormularioGuardia key={existente?.id ?? 'nova'} id={id} existente={existente} />;
}

function FormularioGuardia({ id, existente }: { id?: string; existente?: Guardia }) {
  const { cores } = useTema();
  const editando = !!id;

  const [nome, setNome] = useState(existente?.nome_completo ?? '');
  const [telefone, setTelefone] = useState(existente ? mascararTelefone(existente.telefone) : '');
  const [relacao, setRelacao] = useState<string>(existente?.parentesco_relacao ?? 'Amigos');
  const [erros, setErros] = useState<{ nome?: string; telefone?: string }>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const salvar = useSalvarGuardia();
  const remover = useRemoverGuardia();
  const reenviar = useReenviarConvite();

  const mensagem = (e: unknown) => (e instanceof ErroApi ? e.mensagem : 'Algo deu errado. Tente de novo.');

  const enviar = () => {
    setErroGeral(null);
    const e = {
      nome: nome.trim().length < 2 ? 'Digite o nome dela.' : undefined,
      telefone: telefoneValido(telefone) ? undefined : 'Digite o telefone com DDD.',
    };
    setErros(e);
    if (e.nome || e.telefone) return;
    salvar.mutate(
      { id, dados: { nome_completo: nome.trim(), telefone: somenteDigitos(telefone), parentesco_relacao: relacao } },
      { onSuccess: () => router.back(), onError: (err) => setErroGeral(mensagem(err)) },
    );
  };

  const removerAgora = () => {
    if (!id) return;
    remover.mutate(id, { onSuccess: () => router.back() });
  };

  return (
    <TelaInterna
      cabecalho={{ titulo: editando ? 'Editar guardião' : 'Adicionar guardião', sub: 'Ela vai receber um convite por WhatsApp.', aoFecharTopo: () => router.back() }}
      semNav
      sobreposicao={
        <Confirmacao
          visivel={confirmando}
          titulo="Remover guardiã?"
          texto={`${nome || 'Ela'} deixa de receber seus pedidos de ajuda.`}
          rotuloConfirmar="Remover"
          aoConfirmar={removerAgora}
          aoFechar={() => {
            setConfirmando(false);
            remover.reset();
          }}
          carregando={remover.isPending}
          erro={remover.isError ? mensagem(remover.error) : null}
        />
      }
    >
      <View style={{ gap: 16 }}>
        <Campo rotulo="Nome completo" placeholder="Como você chama essa pessoa" value={nome} onChangeText={setNome} erro={erros.nome} />
        <Campo
          rotulo="Telefone"
          placeholder="(00) 00000-0000"
          value={telefone}
          onChangeText={(t) => setTelefone(mascararTelefone(t))}
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
                  onPress={() => setRelacao(r)}
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
              carregando={reenviar.isPending}
              onPress={() =>
                reenviar.mutate(existente.id, { onSuccess: () => setAviso('Convite reenviado.'), onError: (err) => setErroGeral(mensagem(err)) })
              }
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

      <Botao onPress={enviar} carregando={salvar.isPending} estilo={{ marginTop: 8 }}>
        {editando ? 'Salvar alterações' : 'Salvar guardião'}
      </Botao>
      {editando ? (
        <Botao variante="perigo" onPress={() => setConfirmando(true)}>
          Remover guardião
        </Botao>
      ) : null}
    </TelaInterna>
  );
}
