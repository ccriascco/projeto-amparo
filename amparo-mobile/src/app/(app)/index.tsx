import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { apiEmergencias } from '@/api/endpoints';
import { ErroApi } from '@/api/erros';
import type { NivelRisco, Ocorrencia, Perfil } from '@/api/tipos';
import { BotaoSOS } from '@/components/dominio/BotaoSOS';
import { TelaInterna } from '@/components/layout/TelaInterna';
import { Cartao, CartaoInfo, CirculoIcone } from '@/components/ui/Cartao';
import { Carrossel } from '@/components/ui/Carrossel';
import { Icone, type NomeIcone } from '@/components/ui/Icone';
import { Sheet } from '@/components/ui/Sheet';
import { Texto } from '@/components/ui/Texto';
import { GUIA, textoClassificacao } from '@/conteudo/textos';
import { chaves, useAtualizarPerfil, useEmergenciaAtiva, useOcorrencias, usePerfil } from '@/hooks/dados';
import { useSessao } from '@/store/sessao';
import { useTema } from '@/theme/tema';
import { fixas, raios } from '@/theme/tokens';
import { diaDaOcorrencia, diasDesde, semanaAtual } from '@/utils/datas';
import { abrirDelegaciasProximas } from '@/utils/mapas';
import { localizacaoAtual } from '@/utils/permissoes';
import { iniciais } from '@/utils/texto';

const ROTULO_RISCO: Record<NivelRisco, string> = { Baixo: 'Risco baixo', Medio: 'Risco médio', Alto: 'Risco alto' };

export default function TelaInicio() {
  const { cores, sombraCard } = useTema();
  const qc = useQueryClient();
  const usuaria = useSessao((s) => s.usuaria);
  const perfil = usePerfil();
  const ocorrencias = useOcorrencias();
  const emergenciaAtiva = useEmergenciaAtiva();
  const atualizarPerfil = useAtualizarPerfil();
  const [info, setInfo] = useState<{ titulo: string; texto: string } | null>(null);
  const [erroSos, setErroSos] = useState<string | null>(null);

  const nome = perfil.data?.nome_completo ?? usuaria?.nome_completo ?? '';
  const disfarceLigado = perfil.data?.modo_disfarcado ?? usuaria?.modo_disfarcado ?? false;

  const sos = useMutation({
    mutationFn: async () => {
      // A localização não pode atrasar o pedido: espera no máximo 3 s
      const local = await Promise.race([localizacaoAtual(), new Promise<null>((r) => setTimeout(() => r(null), 3000))]);
      try {
        return (await apiEmergencias.acionar(local ?? undefined)).emergencia_id;
      } catch (e) {
        const ativa = e instanceof ErroApi && e.status === 409 ? (e.dados.emergencia_ativa as { id?: string } | undefined) : undefined;
        if (ativa?.id) return ativa.id;
        throw e;
      }
    },
    onSuccess: (id) => {
      setErroSos(null);
      qc.invalidateQueries({ queryKey: chaves.emergenciaAtiva });
      router.push({ pathname: '/emergencia', params: { id } });
    },
    onError: (e) =>
      setErroSos(
        e instanceof ErroApi
          ? `${e.mensagem} Se puder, ligue 190.`
          : 'Não foi possível enviar o pedido de ajuda. Se puder, ligue 190.',
      ),
  });

  const semana = useMemo(() => {
    const dias = new Set((ocorrencias.data?.ocorrencias ?? []).map(diaDaOcorrencia));
    return semanaAtual().map((s) => ({ ...s, registrou: dias.has(s.dia) }));
  }, [ocorrencias.data]);

  const alternarDisfarce = () => {
    const p = perfil.data;
    if (!p) return;
    if (!p.modo_disfarcado && !p.codigo_disfarce_definido) {
      router.push({ pathname: '/mais/codigo', params: { motivo: 'disfarce' } });
      return;
    }
    atualizarPerfil.mutate({ modo_disfarcado: !p.modo_disfarcado });
  };

  const acoes: { rotulo: string; icone: NomeIcone; ir: () => void }[] = [
    { rotulo: 'Registrar prova', icone: 'camera', ir: () => router.push('/ocorrencias/nova') },
    { rotulo: 'Adicionar guardião', icone: 'user-round-plus', ir: () => router.push('/rede/guardia') },
    { rotulo: 'Ver minhas ocorrências', icone: 'folder-lock', ir: () => router.navigate('/ocorrencias') },
    { rotulo: 'Delegacias próximas', icone: 'map-pin', ir: () => abrirDelegaciasProximas() },
    { rotulo: disfarceLigado ? 'Desativar Modo Disfarce' : 'Ativar Modo Disfarce', icone: 'calculator', ir: alternarDisfarce },
  ];

  const atualizar = () => {
    perfil.refetch();
    ocorrencias.refetch();
    emergenciaAtiva.refetch();
  };

  return (
    <TelaInterna
      aba="inicio"
      cabecalho={{ modo: 'home', nome: nome.split(' ')[0], iniciais: iniciais(nome) }}
      controleAtualizar={<RefreshControl refreshing={perfil.isRefetching} onRefresh={atualizar} tintColor={cores.acento} />}
      sobreposicao={<Sheet visivel={!!info} aoFechar={() => setInfo(null)} titulo={info?.titulo} texto={info?.texto} />}
    >
      {emergenciaAtiva.data?.emergencia ? (
        <Cartao
          onPress={() => router.push({ pathname: '/emergencia', params: { id: emergenciaAtiva.data!.emergencia!.id } })}
          borda={cores.verde30}
          estilo={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 }}
          rotuloAcessivel="Seu pedido de ajuda está ativo. Ver detalhes."
        >
          <CirculoIcone nome="megaphone" cor={cores.verde} fundo={cores.verde12} />
          <View style={{ flex: 1 }}>
            <Texto peso={700} tamanho={16}>
              Pedido de ajuda ativo
            </Texto>
            <Texto variante="cardCorpo">Toque para ver quem foi avisada.</Texto>
          </View>
          <Icone nome="chevron-right" tamanho={20} cor={cores.acento} />
        </Cartao>
      ) : null}

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Texto peso={600} tamanho={18} style={{ lineHeight: 22 }}>
            Ocorrências
          </Texto>
          <Texto variante="cardCorpo">Esta semana</Texto>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }} accessibilityLabel={`Dias com registro nesta semana: ${semana.filter((d) => d.registrou).length} de 7`}>
          {semana.map((d) => (
            <View key={d.dia} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View style={{ width: '100%', height: 8, borderRadius: raios.pilula, backgroundColor: d.registrou ? cores.acento : cores.borda10 }} />
              <Texto tamanho={12} cor="nota" style={{ lineHeight: 12 }}>
                {d.letra}
              </Texto>
            </View>
          ))}
        </View>
      </View>

      <View style={{ alignItems: 'center', gap: 8 }}>
        <Texto accessibilityRole="header" peso={700} tamanho={25} centro style={{ lineHeight: 30 }}>
          Está precisando de ajuda?
        </Texto>
        <Texto variante="cardCorpo" centro>
          Toque e segure o botão abaixo por alguns segundos para acionar uma emergência silenciosa.
        </Texto>
      </View>

      <BotaoSOS aoAcionar={() => sos.mutate()} desabilitado={sos.isPending} testID="sos" />
      {sos.isPending ? (
        <Texto variante="nota" centro accessibilityLiveRegion="assertive">
          Enviando o pedido de ajuda…
        </Texto>
      ) : null}
      {erroSos ? (
        <Texto variante="nota" corLivre={fixas.sos} centro accessibilityLiveRegion="assertive">
          {erroSos}
        </Texto>
      ) : null}

      <View style={{ gap: 12 }}>
        <Texto peso={500} tamanho={14} cor="nota" style={{ letterSpacing: -0.24 }}>
          Ações rápidas
        </Texto>
        <Carrossel rotulo="Ações rápidas">
          {acoes.map((a) => (
            <Pressable key={a.rotulo} onPress={a.ir} accessibilityRole="button" accessibilityLabel={a.rotulo} style={{ width: 84, alignItems: 'center', gap: 8 }}>
              <CirculoIcone nome={a.icone} tamanho={72} tamanhoIcone={26} />
              <Texto peso={600} tamanho={12} cor="textoSuave" centro style={{ lineHeight: 14 }}>
                {a.rotulo}
              </Texto>
            </Pressable>
          ))}
        </Carrossel>
      </View>

      <CartaoRisco perfil={perfil.data} carregando={perfil.isLoading} erro={perfil.isError} aoTentar={() => perfil.refetch()} ocorrencias={ocorrencias.data?.ocorrencias} aoExplicar={(t) => setInfo(t)} />

      <Carrossel rotulo="Guias" gap={12} larguraAtiva={20}>
        {GUIA.map((g) => (
          <Pressable
            key={g.rotulo}
            onPress={() => setInfo({ titulo: g.rotulo, texto: g.texto })}
            accessibilityRole="button"
            accessibilityLabel={g.rotulo}
            style={{
              width: 163,
              height: 128,
              padding: 16,
              justifyContent: 'space-between',
              borderWidth: 1,
              borderColor: cores.borda10,
              borderRadius: raios.guia,
              backgroundColor: cores.card,
              ...sombraCard,
            }}
          >
            <CirculoIcone nome={g.icone} tamanho={36} tamanhoIcone={20} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
              <Texto peso={600} tamanho={14} style={{ flex: 1, lineHeight: 17 }}>
                {g.rotulo}
              </Texto>
              <Texto peso={700} tamanho={16} cor="acento">
                →
              </Texto>
            </View>
          </Pressable>
        ))}
      </Carrossel>
    </TelaInterna>
  );
}

function CartaoRisco({
  perfil,
  carregando,
  erro,
  aoTentar,
  ocorrencias,
  aoExplicar,
}: {
  perfil?: Perfil;
  carregando: boolean;
  erro: boolean;
  aoTentar: () => void;
  ocorrencias?: Ocorrencia[];
  aoExplicar: (t: { titulo: string; texto: string }) => void;
}) {
  const { cores } = useTema();
  if (carregando) {
    return <CartaoInfo icone="shield-check" titulo="Carregando sua leitura…" corpo="Só um instante." />;
  }
  if (erro || !perfil) {
    return <CartaoInfo icone="refresh-cw" titulo="Não foi possível carregar sua leitura" corpo="Toque para tentar de novo." onPress={aoTentar} />;
  }
  const risco = perfil.nivel_risco;
  const explicar = () => aoExplicar({ titulo: 'Como chegamos nesta leitura', texto: textoClassificacao(ROTULO_RISCO[risco ?? 'Baixo']) });

  if (!risco) {
    return (
      <CartaoInfo icone="shield-check" titulo="Ainda não há uma leitura" corpo="Ela aparece depois do seu primeiro registro de ocorrência." />
    );
  }

  if (risco === 'Baixo') {
    const dias = (ocorrencias ?? []).map(diaDaOcorrencia).sort().reverse()[0];
    const corpo = dias
      ? `O acompanhamento discreto segue ativo. Nada novo foi registrado nos últimos ${diasDesde(dias)} dias.`
      : 'O acompanhamento discreto segue ativo.';
    return <CartaoInfo icone="shield-check" titulo="Tudo por aqui está tranquilo" corpo={corpo} link="Ver como chegamos nisso" onPress={explicar} />;
  }

  return (
    <View style={{ gap: 24 }}>
      {risco === 'Medio' ? (
        <CartaoInfo
          icone="bell"
          titulo="Você tem uma atualização"
          corpo="Sua leitura de risco está em atenção. Vale manter sua rede atualizada e ter os contatos de apoio à mão."
          link="Ver como chegamos nisso"
          onPress={explicar}
          borda={cores.borda20}
        />
      ) : null}
      {risco === 'Alto' ? (
        <CartaoInfo
          icone="life-buoy"
          titulo="Ajuda mais perto de você"
          corpo="Ligue 180 (Central da Mulher) ou 190 (Polícia). Toque para buscar a delegacia da mulher mais próxima."
          onPress={() => abrirDelegaciasProximas()}
        />
      ) : (
        <CartaoInfo
          icone="life-buoy"
          titulo="Recursos de apoio"
          corpo="Como registrar uma prova e quem procurar na sua região."
          onPress={() => router.push('/mais/conteudo')}
        />
      )}
      {risco === 'Alto' ? (
        <Pressable onPress={explicar} accessibilityRole="button">
          <Texto variante="link">Ver como chegamos nisso</Texto>
        </Pressable>
      ) : null}
    </View>
  );
}
