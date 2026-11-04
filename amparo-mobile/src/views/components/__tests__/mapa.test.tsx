import { render, screen } from '@testing-library/react-native';

import { localDaRota } from '@/controllers/telas/autenticada/useTelaEmergencia';
import { MapaLocalizacao } from '@/views/components/dominio/MapaLocalizacao';
import { ROTULO_MAPA, ROTULO_SEM_LOCAL } from '@/views/components/dominio/PreviaMapa';

describe('localDaRota', () => {
  it('usa o último ponto e converte o texto do banco em número', () => {
    const pontos = [
      { latitude: '-23.5', longitude: '-46.6', registrado_em: '2026-11-04T00:00:00Z' },
      { latitude: '-20.8827', longitude: '-49.5662', registrado_em: '2026-11-04T00:00:05Z' },
    ];
    expect(localDaRota(pontos)).toEqual({ latitude: -20.8827, longitude: -49.5662 });
  });

  it('sem pontos ou com valor inválido, não há localização', () => {
    expect(localDaRota(undefined)).toBeNull();
    expect(localDaRota([])).toBeNull();
    expect(localDaRota([{ latitude: 'x', longitude: '-46.6', registrado_em: '' }])).toBeNull();
  });
});

describe('MapaLocalizacao', () => {
  it('mostra o mapa com o marcador no ponto enviado', async () => {
    await render(<MapaLocalizacao local={{ latitude: -20.88, longitude: -49.56 }} />);
    expect(screen.getByLabelText(ROTULO_MAPA)).toBeOnTheScreen();
    expect(screen.getByTestId('mapa-marcador').props.coordinate).toEqual({ latitude: -20.88, longitude: -49.56 });
    expect(screen.getByTestId('mapa-sos').props.showsUserLocation).toBe(false);
  });

  it('sem localização, mostra a imagem do design e avisa que ela não foi enviada', async () => {
    await render(<MapaLocalizacao local={null} />);
    expect(screen.getByLabelText(ROTULO_SEM_LOCAL)).toBeOnTheScreen();
    expect(screen.queryByTestId('mapa-sos')).toBeNull();
  });
});
