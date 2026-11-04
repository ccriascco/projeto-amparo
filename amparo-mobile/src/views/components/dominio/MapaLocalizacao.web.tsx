import { type Local, PreviaMapa, ROTULO_MAPA, ROTULO_SEM_LOCAL } from '@/views/components/dominio/PreviaMapa';

const MARGEM = 0.005; // ~500 m para cada lado

// Versão web (o react-native-maps não roda no navegador): mapa do OpenStreetMap, sem chave.
// Mostra só o ponto enviado no acionamento.
export function MapaLocalizacao({ local }: { local: Local | null }) {
  if (!local) return <PreviaMapa rotulo={ROTULO_SEM_LOCAL} />;
  const { latitude, longitude } = local;
  const area = [longitude - MARGEM, latitude - MARGEM, longitude + MARGEM, latitude + MARGEM].join(',');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(area)}&layer=mapnik&marker=${latitude},${longitude}`;
  return (
    <iframe
      src={src}
      title={ROTULO_MAPA}
      aria-label={ROTULO_MAPA}
      data-testid="mapa-sos"
      referrerPolicy="no-referrer"
      loading="lazy"
      style={{ border: 0, width: '100%', height: '100%' }}
    />
  );
}
