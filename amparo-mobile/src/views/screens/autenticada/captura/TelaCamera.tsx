import { CameraView } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTelaCamera } from '@/controllers/telas/autenticada/captura/useTelaCamera';
import { BotaoFechar, BotaoVoltar } from '@/views/components/ui/Basicos';
import { Botao } from '@/views/components/ui/Botao';
import { Icone } from '@/views/components/ui/Icone';
import { Texto } from '@/views/components/ui/Texto';
import { fixas } from '@/views/theme/tokens';

const BRANCO_70 = 'rgba(255,255,255,0.7)';

// Captura de foto ou vídeo (tela escura do protótipo). O arquivo fica no cache do app,
// nunca na galeria, e entra como anexo da ocorrência que está sendo registrada.
export default function TelaCamera() {
  const { camera, video, temPermissao, pronta, gravando, erro, capturados, aoCameraPronta, pedirPermissao, capturar, voltar } = useTelaCamera();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: fixas.midiaFundo }}>
      {temPermissao ? (
        <CameraView
          ref={camera}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          facing="back"
          mode={video ? 'video' : 'picture'}
          onCameraReady={aoCameraPronta}
        />
      ) : (
        <LinearGradient colors={['#3A2B33', fixas.midiaFundo]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      )}

      <View style={{ flex: 1, paddingTop: Math.max(insets.top + 16, 48), paddingHorizontal: 24, paddingBottom: 32 + insets.bottom, gap: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <BotaoVoltar onPress={voltar} cor="#FFFFFF" />
          <BotaoFechar onPress={voltar} cor="#FFFFFF" borda="rgba(255,255,255,0.3)" />
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          {!temPermissao ? (
            <>
              <View style={{ width: 64, height: 64, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <Icone nome={video ? 'video' : 'camera'} tamanho={32} cor={BRANCO_70} />
              </View>
              <Texto centro corLivre={BRANCO_70}>
                Para registrar, o app precisa usar a câmera{video ? ' e o microfone' : ''}.
              </Texto>
              <Botao
                variante="secundario"
                onPress={pedirPermissao}
                estilo={{ borderColor: '#FFFFFF' }}
              >
                Permitir
              </Botao>
            </>
          ) : !pronta ? (
            <Texto centro corLivre={BRANCO_70}>
              {video ? 'Aponte a câmera e toque no círculo para gravar.' : 'Aponte a câmera e toque no círculo para fotografar.'}
            </Texto>
          ) : null}
          {erro ? (
            <Texto variante="nota" centro corLivre="#FFFFFF" accessibilityLiveRegion="polite">
              {erro}
            </Texto>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 96, flexDirection: 'row', gap: 8 }} accessibilityLabel={`${capturados} ${video ? 'vídeo(s)' : 'foto(s)'} nesta ocorrência`}>
            {Array.from({ length: Math.min(capturados, 2) }, (_, i) => (
              <View
                key={i}
                style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Texto peso={700} tamanho={12} corLivre="rgba(255,255,255,0.75)">
                  {i === 1 && capturados > 2 ? `+${capturados - 1}` : String(i + 1)}
                </Texto>
              </View>
            ))}
          </View>

          <Pressable
            onPress={capturar}
            disabled={!temPermissao || !pronta}
            accessibilityRole="button"
            accessibilityLabel={video ? (gravando ? 'Parar gravação' : 'Gravar vídeo') : 'Tirar foto'}
            style={{ width: 76, height: 76, borderRadius: 999, borderWidth: 4, borderColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', opacity: temPermissao && pronta ? 1 : 0.5 }}
          >
            <View style={{ width: gravando ? 26 : 58, height: gravando ? 26 : 58, borderRadius: gravando ? 4 : 999, backgroundColor: fixas.sos }} />
          </Pressable>

          <Pressable onPress={voltar} accessibilityRole="button" style={{ width: 96, alignItems: 'flex-end' }} disabled={gravando}>
            <Texto peso={700} corLivre="#FFFFFF">
              Pronto
            </Texto>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
