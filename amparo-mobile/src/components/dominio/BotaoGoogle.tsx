import { ActivityIndicator, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Texto } from '@/components/ui/Texto';
import { useTema } from '@/theme/tema';
import { fontes } from '@/theme/tokens';

// Botão do Google no estilo do design (fundo da tela, borda cinza, logo colorido).
export function BotaoGoogle({ onPress, carregando = false }: { onPress: () => void; carregando?: boolean }) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      disabled={carregando}
      accessibilityRole="button"
      accessibilityLabel="Entrar com Google"
      accessibilityState={{ busy: carregando }}
      style={({ pressed }) => ({
        width: '100%',
        height: 48,
        borderRadius: 999,
        backgroundColor: cores.tela,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.12)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {carregando ? (
        <ActivityIndicator color="#757575" />
      ) : (
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path fill="#4285F4" d="M23.64 12.204c0-.638-.057-1.252-.164-1.841H12v3.481h6.844c-.295 1.586-1.19 2.93-2.535 3.83v3.185h4.104c2.402-2.212 3.787-5.47 3.787-8.655z" />
          <Path fill="#34A853" d="M12 24c3.24 0 5.956-1.075 7.941-2.909l-4.104-3.185c-1.137.762-2.591 1.212-3.837 1.212-3.126 0-5.772-2.111-6.717-4.948H1.05v3.29C3.026 21.3 7.19 24 12 24z" />
          <Path fill="#FBBC05" d="M5.283 14.17A7.212 7.212 0 0 1 4.907 12c0-.753.135-1.484.376-2.17V6.54H1.05A11.995 11.995 0 0 0 0 12c0 1.936.464 3.769 1.05 5.46l4.233-3.29z" />
          <Path fill="#EA4335" d="M12 4.773c1.762 0 3.343.606 4.587 1.795l3.44-3.44C17.951 1.19 15.235 0 12 0 7.19 0 3.026 2.7 1.05 6.54l4.233 3.29C6.228 6.993 8.874 4.773 12 4.773z" />
        </Svg>
      )}
      <Texto corLivre="#757575" style={{ fontFamily: fontes.core[600], fontSize: 14, lineHeight: 18 }}>
        Entrar com Google
      </Texto>
    </Pressable>
  );
}
