import { router } from 'expo-router';
import { View } from 'react-native';

import type { Ocorrencia } from '@/api/tipos';
import { Cartao, CirculoIcone } from '@/components/ui/Cartao';
import { Icone } from '@/components/ui/Icone';
import { Texto } from '@/components/ui/Texto';
import { useTema } from '@/theme/tema';
import { diaMes, diaMesDeData, hora } from '@/utils/datas';

// Card de registro (Ocorrências e "Todos os registros"): ícone, título, data, hora e check verde.
export function ItemOcorrencia({ ocorrencia, tamanhoTitulo = 16 }: { ocorrencia: Ocorrencia; tamanhoTitulo?: number }) {
  const { cores } = useTema();
  const data = ocorrencia.data_ocorrencia ? diaMesDeData(ocorrencia.data_ocorrencia) : diaMes(ocorrencia.criado_em);
  const horario = hora(ocorrencia.criado_em);
  return (
    <Cartao
      onPress={() => router.push({ pathname: '/ocorrencias/[id]', params: { id: ocorrencia.id } })}
      rotuloAcessivel={`Ocorrência de ${data}, ${horario}: ${ocorrencia.tipos_violencia.join(', ')}. Abrir resumo.`}
      estilo={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 20 }}
    >
      <CirculoIcone nome="file-text" tamanhoIcone={20} />
      <View style={{ flex: 1, gap: 6 }}>
        <Texto peso={700} tamanho={tamanhoTitulo} style={{ lineHeight: Math.round(tamanhoTitulo * 1.2) }}>
          Ocorrência registrada
        </Texto>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icone nome="calendar" tamanho={16} cor={cores.acento} />
            <Texto tamanho={12} cor="acento">
              {data}
            </Texto>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icone nome="clock" tamanho={16} cor={cores.acento} />
            <Texto tamanho={12} cor="acento">
              {horario}
            </Texto>
          </View>
        </View>
      </View>
      <View style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: 'rgba(46,125,107,0.12)', alignItems: 'center', justifyContent: 'center' }}>
        <Icone nome="check" tamanho={20} cor={cores.verde} />
      </View>
    </Cartao>
  );
}
