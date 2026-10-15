import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTema } from '@/views/theme/tema';
import { raios } from '@/views/theme/tokens';

import { Icone } from './Icone';
import { Texto } from './Texto';

// Nota com cadeado que aparece no rodapé das etapas do cadastro e de várias telas
export function NotaCadeado({ children, alinharTopo = false }: { children: string; alinharTopo?: boolean }) {
  const { cores } = useTema();
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: alinharTopo ? 'flex-start' : 'center' }}>
      <Icone nome="lock" tamanho={24} cor={cores.nota} />
      <Texto variante="nota" style={{ flex: 1 }}>
        {children}
      </Texto>
    </View>
  );
}

// StepProgress do design system (trilho vinho 10%, preenchimento vinho)
export function BarraEtapas({ atual, total }: { atual: number; total: number }) {
  const { cores } = useTema();
  const pct = Math.max(0, Math.min(1, atual / total)) * 100;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: atual }}
      style={{ height: 8, borderRadius: raios.pilula, backgroundColor: cores.borda10, overflow: 'hidden' }}
    >
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: raios.pilula, backgroundColor: cores.acento }} />
    </View>
  );
}

// Toggle de 52 × 32 das Configurações de segurança
export function Interruptor({ ligado }: { ligado: boolean }) {
  const { cores } = useTema();
  return (
    <View
      style={{
        width: 52,
        height: 32,
        borderRadius: raios.pilula,
        backgroundColor: ligado ? cores.acento : cores.borda20,
        padding: 4,
        flexDirection: 'row',
        justifyContent: ligado ? 'flex-end' : 'flex-start',
      }}
    >
      <View style={{ width: 24, height: 24, borderRadius: raios.pilula, backgroundColor: cores.tela, boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
    </View>
  );
}

// Linha de pontos dos carrosséis (ativo alonga)
export function Pontos({
  total,
  ativo,
  larguraAtiva = 20,
  tamanho = 6,
  aoTocar,
  corInativa,
}: {
  total: number;
  ativo: number;
  larguraAtiva?: number;
  tamanho?: number;
  aoTocar?: (i: number) => void;
  corInativa?: string;
}) {
  const { cores } = useTema();
  return (
    <View style={{ flexDirection: 'row', gap: tamanho === 8 ? 8 : 6, justifyContent: 'center', alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <Pressable
          key={i}
          onPress={aoTocar ? () => aoTocar(i) : undefined}
          disabled={!aoTocar}
          accessibilityRole="button"
          accessibilityLabel={`Página ${i + 1} de ${total}`}
          accessibilityState={{ selected: i === ativo }}
          hitSlop={8}
          style={{
            width: i === ativo ? larguraAtiva : tamanho,
            height: tamanho,
            borderRadius: raios.pilula,
            backgroundColor: i === ativo ? cores.acento : (corInativa ?? cores.borda20),
          }}
        />
      ))}
    </View>
  );
}

// Botão "Voltar" com chevron (cadastro e capturas)
export function BotaoVoltar({ onPress, cor }: { onPress: () => void; cor?: string }) {
  const { cores } = useTema();
  const c = cor ?? cores.nota;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      hitSlop={12}
      style={{ flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 24 }}
    >
      <Chevron cor={c} />
      <Texto peso={500} corLivre={c} style={{ lineHeight: 18 }}>
        Voltar
      </Texto>
    </Pressable>
  );
}

// Chevron do design (path próprio, 9,5 × 17)
export function Chevron({ cor, largura = 9, altura = 17 }: { cor: string; largura?: number; altura?: number }) {
  return (
    <Svg width={largura} height={altura} viewBox="0 0 9.485 16.97">
      <Path
        d="M 2.414 8.485 L 9.485 15.556 L 8.071 16.97 L 0.293 9.192 C 0.105 9.004 0 8.75 0 8.485 C 0 8.22 0.105 7.966 0.293 7.778 L 8.071 0 L 9.485 1.414 L 2.414 8.485 Z"
        fill={cor}
        fillRule="evenodd"
      />
    </Svg>
  );
}

// Botão redondo de 44 px com X (fechar / sair rápido nas capturas)
export function BotaoFechar({ onPress, cor, borda, rotulo = 'Fechar' }: { onPress: () => void; cor: string; borda: string; rotulo?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={{
        width: 44,
        height: 44,
        borderRadius: raios.pilula,
        borderWidth: 1,
        borderColor: borda,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icone nome="x" tamanho={20} cor={cor} />
    </Pressable>
  );
}
