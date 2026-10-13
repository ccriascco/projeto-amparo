import { render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';

import { BotaoSOS, TEMPO_SEGURAR_MS } from '@/components/dominio/BotaoSOS';
import { Botao } from '@/components/ui/Botao';
import { Campo } from '@/components/ui/Campo';
import { EntradaPin } from '@/components/ui/EntradaPin';

describe('Botao', () => {
  it('chama onPress quando habilitado', async () => {
    const user = userEvent.setup();
    const aoPressionar = jest.fn();
    await render(<Botao onPress={aoPressionar}>Fazer Login</Botao>);
    await user.press(screen.getByRole('button', { name: 'Fazer Login' }));
    expect(aoPressionar).toHaveBeenCalledTimes(1);
  });

  it('não chama onPress desabilitado e expõe o estado para leitores de tela', async () => {
    const user = userEvent.setup();
    const aoPressionar = jest.fn();
    await render(
      <Botao onPress={aoPressionar} desabilitado>
        Continuar
      </Botao>,
    );
    const botao = screen.getByRole('button', { name: 'Continuar' });
    expect(botao).toBeDisabled();
    await user.press(botao);
    expect(aoPressionar).not.toHaveBeenCalled();
  });

  it('fica ocupado e bloqueado enquanto carrega', async () => {
    const aoPressionar = jest.fn();
    await render(
      <Botao onPress={aoPressionar} carregando>
        Salvar
      </Botao>,
    );
    const botao = screen.getByRole('button', { name: 'Salvar' });
    expect(botao).toBeBusy();
    expect(botao).toBeDisabled();
  });
});

describe('Campo', () => {
  it('mostra o rótulo, aceita digitação e exibe o erro', async () => {
    const user = userEvent.setup();
    function Exemplo() {
      const [v, setV] = useState('');
      return <Campo rotulo="Email" value={v} onChangeText={setV} erro={v.includes('@') ? null : 'Esse e-mail não parece válido.'} />;
    }
    await render(<Exemplo />);
    expect(screen.getByText('Email')).toBeOnTheScreen();
    expect(screen.getByText('Esse e-mail não parece válido.')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Email'), 'ana@amparo.com');
    expect(screen.getByLabelText('Email')).toHaveDisplayValue('ana@amparo.com');
    expect(screen.queryByText('Esse e-mail não parece válido.')).not.toBeOnTheScreen();
  });
});

describe('EntradaPin', () => {
  it('aceita só números e no máximo 4 dígitos', async () => {
    const user = userEvent.setup();
    const valores: string[] = [];
    function Exemplo() {
      const [v, setV] = useState('');
      return (
        <EntradaPin
          rotulo="Senha de 4 dígitos"
          valor={v}
          aoMudar={(n) => {
            valores.push(n);
            setV(n);
          }}
        />
      );
    }
    await render(<Exemplo />);
    await user.type(screen.getByLabelText('Senha de 4 dígitos'), '1a2b345');
    expect(valores.at(-1)).toBe('1234');
    expect(screen.getAllByText('•')).toHaveLength(4);
  });
});

describe('BotaoSOS', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('aciona só depois de segurar pelo tempo completo', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const aoAcionar = jest.fn();
    await render(<BotaoSOS aoAcionar={aoAcionar} />);
    const sos = screen.getByRole('button', { name: /SOS/ });

    await user.longPress(sos, { duration: TEMPO_SEGURAR_MS - 1000 });
    expect(aoAcionar).not.toHaveBeenCalled();

    await user.longPress(sos, { duration: TEMPO_SEGURAR_MS + 200 });
    expect(aoAcionar).toHaveBeenCalledTimes(1);
  });

  it('um toque rápido não aciona', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const aoAcionar = jest.fn();
    await render(<BotaoSOS aoAcionar={aoAcionar} />);
    await user.press(screen.getByRole('button', { name: /SOS/ }));
    jest.advanceTimersByTime(TEMPO_SEGURAR_MS * 2);
    expect(aoAcionar).not.toHaveBeenCalled();
  });
});
