import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import fs from 'fs';
import os from 'os';
import path from 'path';

// "Esqueceu a senha?" pelas telas reais, contra o backend de demonstração (banco em memória, envio simulado).
// A conta é criada pelo próprio teste, com dados fictícios. O código chega no log do backend, que o
// lançador do E2E grava em um arquivo temporário (e2e/subirBackend.js).
const porta = process.env.E2E_PORTA || '3100';
const API = `http://127.0.0.1:${porta}`;
const LOG = path.join(os.tmpdir(), `amparo-e2e-backend-${porta}.log`);
const CONTA = {
  cpf: '39053344705',
  email: 'recupera.teste@amparo.test',
  telefone: '11977776666',
  nome_completo: 'Rita Recupera Teste',
  data_nascimento: '1990-05-05',
  senha: 'Antiga#Senha2026',
  guardioes: [{ nome_completo: 'Guardiã Teste', telefone: '11966665555' }],
};
const NOVA = 'Nova#Senha2026';
const ESPERA = { timeout: 15_000 };

async function ultimoCodigo(): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const linhas = fs.readFileSync(LOG, 'utf8').split('\n').filter((l) => l.includes('código de recuperação:'));
    const codigo = linhas.at(-1)?.match(/código de recuperação: (\d{6})/)?.[1];
    if (codigo) return codigo;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('O código de recuperação não apareceu no log do backend de demonstração.');
}

describe('recuperação de senha (app + backend real com banco em memória)', () => {
  it('pede o código por SMS, troca a senha e entra com a nova', async () => {
    const cadastro = await fetch(`${API}/usuarias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(CONTA),
    });
    expect(cadastro.status).toBe(201);

    const user = userEvent.setup();
    await renderRouter(path.join(__dirname, '..', 'src', 'app'), { initialUrl: '/' });
    jest.useRealTimers();

    // Login → "Esqueceu a Senha?" (o e-mail digitado já vem preenchido)
    await user.press(await screen.findByRole('button', { name: 'Já tenho Conta' }, ESPERA));
    await user.type(await screen.findByLabelText('Email'), CONTA.email);
    await user.press(screen.getByRole('link', { name: 'Esqueceu a Senha?' }));
    expect(await screen.findByText('Esqueceu a senha?', {}, ESPERA)).toBeOnTheScreen();
    expect(screen.getByDisplayValue(CONTA.email)).toBeOnTheScreen();

    // Canal SMS → enviar código
    await user.press(screen.getByRole('radio', { name: /^SMS\./ }));
    await user.press(screen.getByRole('button', { name: 'Enviar código' }));
    expect(await screen.findByText('Digite o código', {}, ESPERA)).toBeOnTheScreen();
    expect(screen.getByText(/Se houver uma conta com esse e-mail, enviamos um código/)).toBeOnTheScreen();

    // Código errado → recusa; código certo + senha nova → volta ao login
    await user.type(screen.getByLabelText('Código'), '000000' === (await ultimoCodigo()) ? '000001' : '000000');
    await user.type(screen.getByLabelText('Nova senha'), NOVA);
    await user.type(screen.getByLabelText('Confirmar nova senha'), NOVA);
    await user.press(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByText('Código inválido ou expirado. Peça um novo código.', {}, ESPERA)).toBeOnTheScreen();

    await user.clear(screen.getByLabelText('Código'));
    await user.type(screen.getByLabelText('Código'), await ultimoCodigo());
    await user.press(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByText('Senha alterada. Entre com a nova senha.', {}, ESPERA)).toBeOnTheScreen();

    // A senha antiga não entra mais; a nova entra
    const senha = screen.getByLabelText('Senha');
    await user.type(senha, CONTA.senha);
    await user.press(screen.getByRole('button', { name: 'Fazer Login' }));
    expect(await screen.findByText('E-mail ou senha incorretos. Confira e tente de novo.', {}, ESPERA)).toBeOnTheScreen();
    await user.clear(senha);
    await user.type(senha, NOVA);
    await user.press(screen.getByRole('button', { name: 'Fazer Login' }));
    expect(await screen.findByText('Olá, Rita', {}, ESPERA)).toBeOnTheScreen();
  });
});
