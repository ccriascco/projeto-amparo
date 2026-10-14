import { router } from 'expo-router';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ItemOcorrencia } from '@/components/dominio/ItemOcorrencia';
import { TelaInterna } from '@/components/layout/TelaInterna';
import { Carregando, ErroCarregar, Vazio } from '@/components/ui/Estados';
import { Icone } from '@/components/ui/Icone';
import { Texto } from '@/components/ui/Texto';
import { useOcorrencias } from '@/hooks/dados';
import { useTema } from '@/theme/tema';
import { raios } from '@/theme/tokens';
import { diaDaOcorrencia, periodoDe } from '@/utils/datas';

const FILTROS = ['Todos', 'Esta semana', 'Este mês', 'Mais antigas'] as const;
type Filtro = (typeof FILTROS)[number];

export default function TelaTodosRegistros() {
  usePreventScreenCapture();
  const { cores } = useTema();
  const ocorrencias = useOcorrencias();
  const [filtro, setFiltro] = useState<Filtro>('Todos');
  const [menuAberto, setMenuAberto] = useState(false);

  const lista = useMemo(
    () => (ocorrencias.data?.ocorrencias ?? []).filter((o) => filtro === 'Todos' || periodoDe(diaDaOcorrencia(o)) === filtro),
    [ocorrencias.data, filtro],
  );

  return (
    <TelaInterna
      aba="documentacao"
      cabecalho={{ titulo: 'Todos os registros', sub: 'Suas ocorrências em ordem, da mais recente para a mais antiga.', aoFecharTopo: () => router.back() }}
      gap={16}
    >
      <View style={{ alignSelf: 'flex-start', zIndex: 20 }}>
        <Pressable
          onPress={() => setMenuAberto((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={`Filtrar por data. Atual: ${filtro}`}
          accessibilityState={{ expanded: menuAberto }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            minHeight: 40,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: raios.pilula,
            borderWidth: 1,
            borderColor: cores.borda20,
            backgroundColor: cores.card,
          }}
        >
          <Icone nome="sliders-horizontal" tamanho={18} cor={cores.acento} />
          <Texto variante="link">{filtro === 'Todos' ? 'Filtrar por data' : filtro}</Texto>
          <Icone nome="chevron-down" tamanho={16} cor={cores.acento} />
        </Pressable>
        {menuAberto ? (
          <View
            accessibilityRole="menu"
            style={{
              position: 'absolute',
              top: 48,
              left: 0,
              minWidth: 200,
              padding: 8,
              gap: 2,
              borderRadius: raios.card,
              borderWidth: 1,
              borderColor: cores.borda10,
              backgroundColor: cores.card,
              boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            }}
          >
            {FILTROS.map((f) => {
              const on = f === filtro;
              return (
                <Pressable
                  key={f}
                  onPress={() => {
                    setFiltro(f);
                    setMenuAberto(false);
                  }}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: on }}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: 40,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    backgroundColor: on ? cores.borda10 : 'transparent',
                  }}
                >
                  <Texto peso={on ? 700 : 400} tamanho={14} corLivre={on ? cores.acento : cores.textoSuave}>
                    {f}
                  </Texto>
                  {on ? <Icone nome="check" tamanho={16} cor={cores.acento} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {ocorrencias.isLoading ? <Carregando rotulo="Carregando seus registros…" /> : null}
      {ocorrencias.isError ? <ErroCarregar erro={ocorrencias.error} aoTentar={() => ocorrencias.refetch()} /> : null}
      {ocorrencias.isSuccess && lista.length === 0 ? (
        <Vazio icone="calendar" titulo="Nada neste período" texto="Escolha outro período no filtro." />
      ) : null}
      {lista.map((o) => (
        <ItemOcorrencia key={o.id} ocorrencia={o} tamanhoTitulo={20} />
      ))}
      {ocorrencias.data && ocorrencias.data.total > ocorrencias.data.ocorrencias.length ? (
        <Texto variante="nota" centro>{`Mostrando os ${ocorrencias.data.ocorrencias.length} registros mais recentes.`}</Texto>
      ) : null}
    </TelaInterna>
  );
}
