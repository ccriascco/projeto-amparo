import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, View } from 'react-native';

import { Icone } from '@/components/ui/Icone';
import { Texto } from '@/components/ui/Texto';
import { useTema } from '@/theme/tema';
import { fixas, raios } from '@/theme/tokens';

const tempo = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// Player de áudio no estilo do card do design (botão vinho, barra de progresso, tempo e duração).
export function PlayerAudio({ uri }: { uri: string }) {
  const { cores, sombraCard } = useTema();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const progresso = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;

  const alternar = () => {
    if (status.playing) return player.pause();
    if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) player.seekTo(0);
    player.play();
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: raios.card, borderWidth: 1, borderColor: cores.borda10, backgroundColor: cores.card, ...sombraCard }}>
      <Pressable
        onPress={alternar}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pausar áudio' : 'Tocar áudio'}
        style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: cores.acento, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icone nome={status.playing ? 'pause' : 'play'} tamanho={22} cor="#FFFFFF" />
      </Pressable>
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ height: 4, borderRadius: 999, backgroundColor: cores.borda10 }}>
          <View style={{ width: `${progresso * 100}%`, height: 4, borderRadius: 999, backgroundColor: cores.acento }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Texto variante="nota" cor="textoSuave">
            {tempo(status.currentTime)}
          </Texto>
          <Texto variante="nota">{tempo(status.duration)}</Texto>
        </View>
      </View>
    </View>
  );
}

// Vídeo com os controles nativos, no quadro escuro do design.
export function PlayerVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return (
    <View style={{ height: 240, borderRadius: raios.card, overflow: 'hidden', backgroundColor: fixas.midiaFundo }}>
      <VideoView player={player} style={{ width: '100%', height: '100%' }} nativeControls contentFit="contain" allowsPictureInPicture={false} />
    </View>
  );
}
