import { HttpException, HttpStatus } from '@nestjs/common';
import { erroDoBanco, tratarErro } from './erro.util';

describe('tratarErro', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('preserva HttpException lançada de propósito (mensagem já é segura)', () => {
    const original = new HttpException({ erro: 'Acesso Negado.' }, HttpStatus.FORBIDDEN);
    expect(tratarErro(original, 'x')).toBe(original);
  });

  it('duplicidade do Postgres (23505) vira 409', () => {
    const erro = tratarErro(erroDoBanco({ message: 'duplicate key value violates unique constraint "usuarias_cpf_key"', code: '23505' }), 'msg');
    expect(erro.getStatus()).toBe(HttpStatus.CONFLICT);
    expect(JSON.stringify(erro.getResponse())).not.toContain('usuarias_cpf_key');
  });

  it('violação de regra do banco (P0001, trigger) vira 400', () => {
    const erro = tratarErro(erroDoBanco({ message: 'Regra de Ouro: ...', code: 'P0001' }), 'Não foi possível remover.');
    expect(erro.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('banco inacessível (fetch failed) vira 503', () => {
    const erro = tratarErro(new TypeError('fetch failed'), 'msg');
    expect(erro.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('falha desconhecida vira 500 com mensagem genérica', () => {
    const erro = tratarErro(new Error('boom interno'), 'Não foi possível listar.');
    expect(erro.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(JSON.stringify(erro.getResponse())).not.toContain('boom interno');
  });
});
