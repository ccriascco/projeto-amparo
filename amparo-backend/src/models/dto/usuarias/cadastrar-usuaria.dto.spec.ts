import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CadastrarUsuariaDto } from './cadastrar-usuaria.dto';

const base = {
  cpf: '52998224725',
  email: 'ana@amparo.com',
  telefone: '11988887777',
  nome_completo: 'Ana Teste',
  data_nascimento: '1995-05-05',
  senha: 'Amparo#2026Seguro',
  guardioes: [{ nome_completo: 'Guardiã', telefone: '11999998888' }],
};

async function erros(sobrescrita: Record<string, unknown>) {
  const dto = plainToInstance(CadastrarUsuariaDto, { ...base, ...sobrescrita });
  const lista = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return lista.map((e) => e.property);
}

describe('CadastrarUsuariaDto', () => {
  it('aceita um cadastro válido', async () => {
    expect(await erros({})).toEqual([]);
  });

  it('aceita CPF com máscara e normaliza para só dígitos', async () => {
    const dto = plainToInstance(CadastrarUsuariaDto, { ...base, cpf: '529.982.247-25' });
    expect(await validate(dto)).toEqual([]);
    expect(dto.cpf).toBe('52998224725');
  });

  it('recusa CPF com dígitos verificadores inválidos', async () => {
    expect(await erros({ cpf: '12345678901' })).toContain('cpf');
  });

  it('recusa CPF com todos os dígitos iguais', async () => {
    expect(await erros({ cpf: '11111111111' })).toContain('cpf');
  });

  it.each(['123.456.789-09', '12345678909', '   123.456.789-09  '])('aceita CPF válido %p', async (cpf) => {
    expect(await erros({ cpf })).toEqual([]);
  });

  it.each(['000.000.000-00', '111.111.111-11', '222.222.222-22', '123.456.789-10', '123456789', '1234567890912'])(
    'recusa CPF inválido %p',
    async (cpf) => {
      expect(await erros({ cpf })).toContain('cpf');
    },
  );

  it('devolve mensagem clara quando o CPF é inválido', async () => {
    const dto = plainToInstance(CadastrarUsuariaDto, { ...base, cpf: '12345678910' });
    const [erro] = await validate(dto);
    expect(Object.values(erro.constraints ?? {})[0]).toMatch(/^CPF inválido/);
  });

  it('recusa CPF com letras', async () => {
    expect(await erros({ cpf: 'abcdefghijk' })).toContain('cpf');
  });

  it('recusa data de nascimento no futuro', async () => {
    expect(await erros({ data_nascimento: '2999-01-01' })).toContain('data_nascimento');
  });

  it('recusa senha acima de 72 bytes (bcrypt ignora o excedente em silêncio)', async () => {
    expect(await erros({ senha: 'a'.repeat(73) })).toContain('senha');
  });

  it('código do disfarce: obrigatório com o disfarce ligado e só 4 números', async () => {
    expect(await erros({ modo_disfarcado: true })).toContain('codigo_disfarce');
    expect(await erros({ modo_disfarcado: true, codigo_disfarce: '123' })).toContain('codigo_disfarce');
    expect(await erros({ modo_disfarcado: true, codigo_disfarce: '12a4' })).toContain('codigo_disfarce');
    expect(await erros({ modo_disfarcado: true, codigo_disfarce: '12345' })).toContain('codigo_disfarce');
    expect(await erros({ modo_disfarcado: true, codigo_disfarce: '1207' })).toEqual([]);
    expect(await erros({ modo_disfarcado: false })).toEqual([]);
  });

  it('o campo antigo senha_app não é mais aceito', async () => {
    expect(await erros({ senha_app: 'calc12345' })).toContain('senha_app');
  });

  it('cadastro pelo Google dispensa a senha; sem Google ela é obrigatória', async () => {
    expect(await erros({ senha: undefined })).toContain('senha');
    expect(await erros({ senha: undefined, google_id_token: 'tok' })).toEqual([]);
  });

  it('recusa mais de 5 guardiãs', async () => {
    const guardioes = Array.from({ length: 6 }, () => ({ nome_completo: 'G', telefone: '11999998888' }));
    expect(await erros({ guardioes })).toContain('guardioes');
  });
});
