import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsuariasService } from './usuarias.service';
import { SessoesService } from './sessoes.service';
import { MAX_TENTATIVAS_RECUPERACAO, RecuperacaoSenhaService, RESPOSTA_PEDIDO } from './recuperacao-senha.service';
import { MENSAGEM_CODIGO_RECUPERACAO } from './mensagens.service';
import { BancoMemoria } from '../../test/support/supabase-memoria';

const CONTA = {
  cpf: '52998224725',
  email: 'ana@amparo.test',
  telefone: '11999998888',
  nome_completo: 'Ana Teste',
  data_nascimento: '1995-01-01',
  senha: 'Amparo#2026',
  guardioes: [{ nome_completo: 'Guardiã Um', telefone: '11988887777' }],
};
const NOVA = 'Nova#Senha2026';
const CODIGO_INVALIDO = { response: { erro: 'Código inválido ou expirado. Peça um novo código.' } };

describe('RecuperacaoSenhaService', () => {
  let banco: BancoMemoria;
  let usuarias: UsuariasService;
  let service: RecuperacaoSenhaService;
  let mensagens: { enviarConvite: jest.Mock; enviarPedidoDeAjuda: jest.Mock; enviarCodigoRecuperacao: jest.Mock };

  const ultimoCodigo = () => mensagens.enviarCodigoRecuperacao.mock.calls.at(-1)![2] as string;
  const codigoErrado = (certo: string) => String((Number(certo) + 1) % 1_000_000).padStart(6, '0');

  beforeEach(async () => {
    banco = new BancoMemoria();
    mensagens = { enviarConvite: jest.fn(), enviarPedidoDeAjuda: jest.fn(), enviarCodigoRecuperacao: jest.fn() };
    const sessoes = new SessoesService();
    (sessoes as any).supabase = banco.cliente();
    usuarias = new UsuariasService(new JwtService({ secret: 'segredo-de-teste' }), { revogar: jest.fn() } as any, sessoes, { verificar: jest.fn() } as any, mensagens as any);
    (usuarias as any).supabase = banco.cliente();
    service = new RecuperacaoSenhaService(sessoes, mensagens as any);
    (service as any).supabase = banco.cliente();
    await usuarias.cadastrar(CONTA);
  });

  it('envia o código pelo canal escolhido: e-mail ou telefone da conta', async () => {
    expect(await service.pedir(CONTA.email, 'email')).toEqual(RESPOSTA_PEDIDO);
    expect(mensagens.enviarCodigoRecuperacao).toHaveBeenLastCalledWith('email', CONTA.email, expect.stringMatching(/^\d{6}$/));
    await service.pedir(CONTA.email, 'sms');
    expect(mensagens.enviarCodigoRecuperacao).toHaveBeenLastCalledWith('sms', CONTA.telefone, expect.stringMatching(/^\d{6}$/));
  });

  it('e-mail sem conta recebe a mesma resposta e nada é enviado', async () => {
    expect(await service.pedir('ninguem@amparo.test', 'email')).toEqual(RESPOSTA_PEDIDO);
    expect(mensagens.enviarCodigoRecuperacao).not.toHaveBeenCalled();
    await expect(service.redefinir('ninguem@amparo.test', '123456', NOVA)).rejects.toMatchObject(CODIGO_INVALIDO);
  });

  it('guarda só o hash do código, com validade de 15 minutos', async () => {
    await service.pedir(CONTA.email, 'email');
    const [pedido] = banco.tabelas.recuperacoes_senha;
    expect(pedido.codigo_hash).not.toBe(ultimoCodigo());
    expect(await bcrypt.compare(ultimoCodigo(), pedido.codigo_hash)).toBe(true);
    const minutos = (new Date(pedido.expira_em).getTime() - Date.now()) / 60_000;
    expect(minutos).toBeGreaterThan(14);
    expect(minutos).toBeLessThanOrEqual(15);
  });

  it('com o código certo troca a senha, desconecta todos os aparelhos e o código não vale de novo', async () => {
    await usuarias.login({ email: CONTA.email, senha: CONTA.senha });
    expect(banco.tabelas.sessoes_aparelho.length).toBeGreaterThan(0);
    await service.pedir(CONTA.email, 'email');
    const codigo = ultimoCodigo();

    expect(await service.redefinir(CONTA.email, codigo, NOVA)).toEqual({ mensagem: 'Senha alterada. Entre com a nova senha.' });
    expect(banco.tabelas.sessoes_aparelho).toHaveLength(0);
    await expect(usuarias.login({ email: CONTA.email, senha: CONTA.senha })).rejects.toBeDefined();
    await expect(usuarias.login({ email: CONTA.email, senha: NOVA })).resolves.toHaveProperty('access_token');
    await expect(service.redefinir(CONTA.email, codigo, 'Outra#Senha2026')).rejects.toMatchObject(CODIGO_INVALIDO);
  });

  it('pedir um código novo invalida o anterior', async () => {
    await service.pedir(CONTA.email, 'email');
    const antigo = ultimoCodigo();
    await service.pedir(CONTA.email, 'email');
    expect(banco.tabelas.recuperacoes_senha).toHaveLength(1);
    if (antigo !== ultimoCodigo()) await expect(service.redefinir(CONTA.email, antigo, NOVA)).rejects.toMatchObject(CODIGO_INVALIDO);
    await expect(service.redefinir(CONTA.email, ultimoCodigo(), NOVA)).resolves.toBeDefined();
  });

  it(`depois de ${MAX_TENTATIVAS_RECUPERACAO} códigos errados, nem o certo vale mais`, async () => {
    await service.pedir(CONTA.email, 'email');
    const certo = ultimoCodigo();
    for (let i = 0; i < MAX_TENTATIVAS_RECUPERACAO; i++) {
      await expect(service.redefinir(CONTA.email, codigoErrado(certo), NOVA)).rejects.toMatchObject(CODIGO_INVALIDO);
    }
    await expect(service.redefinir(CONTA.email, certo, NOVA)).rejects.toMatchObject(CODIGO_INVALIDO);
  });

  it('código expirado não vale', async () => {
    await service.pedir(CONTA.email, 'email');
    banco.tabelas.recuperacoes_senha[0].expira_em = new Date(Date.now() - 1000).toISOString();
    await expect(service.redefinir(CONTA.email, ultimoCodigo(), NOVA)).rejects.toMatchObject(CODIGO_INVALIDO);
  });

  it('aceita o e-mail com maiúsculas e espaços', async () => {
    await service.pedir('  ANA@amparo.test ', 'email');
    await expect(service.redefinir('Ana@Amparo.Test', ultimoCodigo(), NOVA)).resolves.toBeDefined();
  });

  it('a mensagem é discreta: não cita o Amparo', () => {
    const texto = `${MENSAGEM_CODIGO_RECUPERACAO.assunto} ${MENSAGEM_CODIGO_RECUPERACAO.texto('123456')}`;
    expect(texto).toContain('123456');
    expect(texto.toLowerCase()).not.toContain('amparo');
  });
});
