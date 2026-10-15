import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import path from 'path';

// Percorre as telas que o fluxo principal não cobre, pelas telas reais e contra o backend de demonstração
// (banco em memória, mensagens simuladas). Todos os dados são fictícios.
//   cadastro em 8 etapas → rede de apoio (nova guardiã) → Minha Conta (troca de nome)
//   → Segurança (criar código e ligar o Modo Disfarce) → travar na calculadora → destravar com o código
const NOVA = {
  nome: 'Joana Teste da Silva',
  nascimento: '01011990',
  telefone: '11912345678',
  cpf: '11144477735',
  email: 'joana.teste@amparo.test',
  senha: 'Teste#2026x',
  codigo: '2468',
};
const ESPERA = { timeout: 15_000 };

describe('telas da conta, da rede e do Modo Disfarce (app + backend real com banco em memória)', () => {
  it('cadastra, adiciona guardiã, edita a conta, liga o disfarce e destrava pela calculadora', async () => {
    const user = userEvent.setup();
    await renderRouter(path.join(__dirname, '..', 'src', 'app'), { initialUrl: '/' });
    jest.useRealTimers();

    // Cadastro
    await user.press(await screen.findByRole('button', { name: 'Criar Conta' }, ESPERA));
    await user.type(await screen.findByLabelText('Nome completo'), NOVA.nome);
    await user.type(screen.getByLabelText('Data de Nascimento'), NOVA.nascimento);
    await user.type(screen.getByLabelText('Telefone'), NOVA.telefone);
    expect(screen.getByDisplayValue('01/01/1990')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Continuar' }));
    await user.type(await screen.findByLabelText('CPF'), NOVA.cpf);
    expect(screen.getByDisplayValue('111.444.777-35')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Continuar' }));
    await user.type(await screen.findByLabelText('E-mail'), NOVA.email);
    await user.press(screen.getByRole('button', { name: 'Continuar' }));
    await user.type(await screen.findByLabelText('Senha'), NOVA.senha);
    await user.press(screen.getByRole('button', { name: 'Continuar' }));
    await user.press(await screen.findByRole('button', { name: 'Permitir Localização' }));
    await user.press(await screen.findByRole('button', { name: 'Permitir Notificação e Camera' }));
    await user.press(await screen.findByRole('radio', { name: /^Manter Modo Padrão/ }));
    await user.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Etapa 8/8')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Nome'), 'Clara');
    await user.type(screen.getByLabelText('Telefone'), '11955554444');
    await user.press(screen.getByRole('button', { name: 'Concluir cadastro' }));
    expect(await screen.findByText('Olá, Joana', {}, ESPERA)).toBeOnTheScreen();

    // Rede de apoio: a guardiã do cadastro aparece e uma nova é adicionada
    await user.press(screen.getAllByRole('tab', { name: 'Rede de apoio' })[0]);
    expect(await screen.findByText('Clara', {}, ESPERA)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Adicionar guardião' }));
    await user.type(await screen.findByLabelText('Nome completo'), 'Bruna Lima');
    await user.type(screen.getByLabelText('Telefone'), '11933332222');
    await user.press(screen.getByRole('radio', { name: 'Família' }));
    await user.press(screen.getByRole('button', { name: 'Salvar guardião' }));
    expect(await screen.findByText('Bruna Lima', {}, ESPERA)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Bruna Lima, Família, convite pendente/ })).toBeOnTheScreen();

    // Minha Conta: troca o nome
    await user.press(screen.getAllByRole('tab', { name: 'Mais' })[0]);
    await user.press(await screen.findByRole('button', { name: /^Minha Conta/ }, ESPERA));
    const campoNome = await screen.findByDisplayValue(NOVA.nome, {}, ESPERA);
    await user.clear(campoNome);
    await user.type(campoNome, 'Joana Teste Souza');
    await user.press(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByText('Dados salvos.', {}, ESPERA)).toBeOnTheScreen();

    // Segurança: ligar o disfarce sem código leva a criar o código primeiro
    await user.press(screen.getAllByRole('tab', { name: 'Mais' })[0]);
    await user.press(await screen.findByRole('button', { name: /^Configurações de Segurança/ }, ESPERA));
    await user.press(await screen.findByRole('button', { name: 'Modo Disfarce, desligado' }, ESPERA));
    expect(await screen.findByText('Para ligar o Modo Disfarce, crie um código de quatro números.', {}, ESPERA)).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Novo código'), NOVA.codigo);
    await user.type(screen.getByLabelText('Confirmar novo código'), '2469');
    expect(await screen.findByText('Os dois números não são iguais. Confira e digite de novo.')).toBeOnTheScreen();
    await user.clear(screen.getByLabelText('Confirmar novo código'));
    await user.type(screen.getByLabelText('Confirmar novo código'), NOVA.codigo);
    expect(await screen.findByText('Código novo pronto para salvar.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Salvar novo código' }));
    expect(await screen.findByRole('button', { name: 'Modo Disfarce, ligado' }, ESPERA)).toBeOnTheScreen();

    // Calculadora do cabeçalho trava o app; o código + "=" destrava
    await user.press(screen.getAllByRole('button', { name: 'Modo Disfarce' })[0]);
    expect(await screen.findByRole('button', { name: 'Igual' }, ESPERA)).toBeOnTheScreen();
    for (const d of NOVA.codigo) await user.press(screen.getByRole('button', { name: d }));
    await user.press(screen.getByRole('button', { name: 'Igual' }));
    expect(await screen.findByText('Olá, Joana', {}, ESPERA)).toBeOnTheScreen();
  });
});
