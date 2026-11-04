import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import path from 'path';

// Fluxo principal de ponta a ponta, pelas telas reais:
//   boas-vindas → login → Início (risco vindo da IA) → registrar ocorrência de violência física
//   → a IA reclassifica e o Início passa a mostrar a ajuda para risco alto.
// Conta fictícia criada pelo backend de demonstração (amparo-backend/test/servidor-memoria.ts).
const CONTA = { email: 'demo@amparo.test', senha: 'Demo#Amparo2026' };

describe('fluxo principal (app + backend real com banco em memória + IA simulada)', () => {
  it('entra, vê a leitura de risco, registra uma ocorrência e a IA atualiza o risco', async () => {
    const user = userEvent.setup();
    await renderRouter(path.join(__dirname, '..', 'src', 'app'), { initialUrl: '/' });
    // O renderRouter liga relógios falsos; aqui a rede é real, então o tempo também precisa ser
    jest.useRealTimers();

    // Boas-vindas → login
    await user.press(await screen.findByRole('button', { name: 'Já tenho Conta' }, { timeout: 15_000 }));
    await user.type(await screen.findByLabelText('Email'), CONTA.email);
    await user.type(screen.getByLabelText('Senha'), CONTA.senha);
    await user.press(screen.getByRole('button', { name: 'Fazer Login' }));

    // Início: saudação e leitura atual (2 ocorrências recentes sem violência física → risco médio)
    expect(await screen.findByText('Olá, Marina', {}, { timeout: 15_000 })).toBeOnTheScreen();
    expect(await screen.findByText('Você tem uma atualização', {}, { timeout: 15_000 })).toBeOnTheScreen();
    // Cartão da leitura de risco, logo abaixo do SOS: nível calculado pela IA
    expect(await screen.findByLabelText(/^Leitura de risco da IA: Médio\. Atualizada em \d{2}\/\d{2}/)).toBeOnTheScreen();

    // Nova ocorrência pela ação rápida "Registrar prova"
    await user.press(screen.getByRole('button', { name: 'Registrar prova' }));
    await user.press(await screen.findByRole('checkbox', { name: 'Violência Física' }));
    await user.press(screen.getByRole('button', { name: 'Salvar ocorrência' }));

    // Resumo da ocorrência salva
    expect(await screen.findByText('Resumo da ocorrência', {}, { timeout: 15_000 })).toBeOnTheScreen();
    expect(await screen.findByText('Física')).toBeOnTheScreen();

    // De volta ao Início: a IA reclassificou para risco alto
    await user.press(screen.getAllByRole('tab', { name: 'Início' })[0]);
    expect(await screen.findByText('Ajuda mais perto de você', {}, { timeout: 20_000 })).toBeOnTheScreen();
    expect(await screen.findByLabelText(/^Leitura de risco da IA: Alto\./)).toBeOnTheScreen();
  });
});
