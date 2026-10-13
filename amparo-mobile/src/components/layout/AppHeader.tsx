import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Chevron } from '@/components/ui/Basicos';
import { Icone } from '@/components/ui/Icone';
import { Texto } from '@/components/ui/Texto';
import { fixas, fontes, raios } from '@/theme/tokens';

// AppHeader do protótipo: faixa em gradiente vinho com avatar (ou botão de fechar),
// atalhos sino → Rede, calculadora → Modo Disfarce, engrenagem → Mais, e título opcional.
const PATH_SINO =
  'M12 22a2.4 2.4 0 0 0 2.4-2.4H9.6A2.4 2.4 0 0 0 12 22Zm7-5.6v-5a7 7 0 0 0-5.2-6.8V3.9a1.8 1.8 0 1 0-3.6 0v.7A7 7 0 0 0 5 11.4v5l-1.6 1.7v.8h17.2v-.8L19 16.4Z';
const PATH_CALCULADORA =
  'M6.5 2h11A2.5 2.5 0 0 1 20 4.5v15a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Zm.4 2.6v3.2h10.2V4.6H6.9Zm.6 5.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Zm4.5 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Zm4.5 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8ZM7.5 15a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Zm4.5 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Zm4.5 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z';
const PATH_ENGRENAGEM =
  'm19.4 13-.1-1 .1-1 2-1.6a.5.5 0 0 0 .1-.6l-1.9-3.3a.5.5 0 0 0-.6-.2l-2.4 1a7.3 7.3 0 0 0-1.7-1l-.4-2.5a.5.5 0 0 0-.5-.4h-3.8a.5.5 0 0 0-.5.4l-.4 2.5c-.6.2-1.2.6-1.7 1l-2.4-1a.5.5 0 0 0-.6.2L2.7 8.8a.5.5 0 0 0 .1.6L4.8 11l-.1 1 .1 1-2 1.6a.5.5 0 0 0-.1.6l1.9 3.3c.1.2.4.3.6.2l2.4-1c.5.4 1.1.8 1.7 1l.4 2.5c0 .3.2.4.5.4h3.8c.3 0 .5-.1.5-.4l.4-2.5c.6-.2 1.2-.6 1.7-1l2.4 1c.2.1.5 0 .6-.2l1.9-3.3a.5.5 0 0 0-.1-.6L19.4 13ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z';

const VIDRO = 'rgba(255,255,255,0.18)';

function BotaoHeader({ path, rotulo, onPress }: { path: string; rotulo: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: raios.pilula,
        backgroundColor: VIDRO,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path d={path} fill="#FFFFFF" />
      </Svg>
    </Pressable>
  );
}

export type AppHeaderProps = {
  modo?: 'home' | 'tela';
  nome?: string;
  iniciais?: string;
  titulo?: string;
  sub?: string;
  aoFecharTopo?: () => void;
  aoVoltar?: () => void;
  aoSair?: () => void;
  aoNotificacoes?: () => void;
  aoCalculadora?: () => void;
  aoConfiguracoes?: () => void;
};

export function AppHeader({
  modo = 'tela',
  nome,
  iniciais,
  titulo,
  sub,
  aoFecharTopo,
  aoVoltar,
  aoSair,
  aoNotificacoes,
  aoCalculadora,
  aoConfiguracoes,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={fixas.gradienteHeader}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        zIndex: 2,
        borderBottomLeftRadius: raios.header,
        borderBottomRightRadius: raios.header,
        paddingTop: Math.max(insets.top + 16, 48),
        paddingHorizontal: 32,
        paddingBottom: 32,
        gap: 16,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        {aoFecharTopo ? (
          <Pressable
            onPress={aoFecharTopo}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            style={{ width: 48, height: 48, borderRadius: raios.pilula, backgroundColor: VIDRO, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icone nome="x" tamanho={24} cor="#FFFFFF" />
          </Pressable>
        ) : (
          // O design usa uma foto; o app usa as iniciais (não há foto de perfil no backend)
          <View
            accessibilityLabel={nome ? `Perfil de ${nome}` : 'Perfil'}
            style={{ width: 48, height: 48, borderRadius: raios.pilula, backgroundColor: VIDRO, alignItems: 'center', justifyContent: 'center' }}
          >
            <Texto corLivre="#FFFFFF" style={{ fontFamily: fontes.display[700], fontSize: 16, lineHeight: 20 }}>
              {iniciais || '·'}
            </Texto>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <BotaoHeader path={PATH_SINO} rotulo="Rede de apoio" onPress={aoNotificacoes} />
          <BotaoHeader path={PATH_CALCULADORA} rotulo="Modo Disfarce" onPress={aoCalculadora} />
          <BotaoHeader path={PATH_ENGRENAGEM} rotulo="Mais opções" onPress={aoConfiguracoes} />
        </View>
      </View>

      {titulo ? (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {aoVoltar ? (
              <Pressable onPress={aoVoltar} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 32, height: 32, marginLeft: -6, alignItems: 'center', justifyContent: 'center' }}>
                <Chevron cor="#FFFFFF" largura={10} altura={18} />
              </Pressable>
            ) : null}
            {aoSair ? (
              <Pressable onPress={aoSair} accessibilityRole="button" accessibilityLabel="Fechar" style={{ width: 32, height: 32, marginLeft: -6, alignItems: 'center', justifyContent: 'center' }}>
                <Icone nome="x" tamanho={22} cor="#FFFFFF" />
              </Pressable>
            ) : null}
            <Texto accessibilityRole="header" corLivre="#FFFFFF" peso={700} tamanho={25} style={{ flex: 1, lineHeight: 30 }}>
              {titulo}
            </Texto>
          </View>
          {sub ? (
            <Texto variante="cardCorpo" corLivre="rgba(255,255,255,0.8)">
              {sub}
            </Texto>
          ) : null}
        </View>
      ) : null}

      {modo === 'home' ? (
        <View style={{ gap: 2 }}>
          <Texto accessibilityRole="header" corLivre="#FFFFFF" peso={700} tamanho={22} style={{ lineHeight: 26 }}>
            Olá, {nome}
          </Texto>
          <Texto variante="cardCorpo" corLivre="rgba(255,255,255,0.8)">
            Como podemos te ajudar hoje?
          </Texto>
        </View>
      ) : null}
    </LinearGradient>
  );
}
