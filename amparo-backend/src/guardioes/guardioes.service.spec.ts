import { HttpException } from '@nestjs/common';
import { GuardioesService } from './guardioes.service';

/**
 * Fake mínimo do query builder do supabase-js: cada método da cadeia
 * (from/select/eq/order/single/insert/update/delete) devolve o próprio
 * builder, e `await` nele resolve para o próximo item da fila de
 * `respostas` — na mesma ordem em que o service faz as chamadas reais.
 */
function criarSupabaseFake(respostas: any[]) {
  let indice = 0;
  const builder: any = {
    from: jest.fn(() => builder),
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    order: jest.fn(() => builder),
    single: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    // oxlint-disable-next-line unicorn/no-thenable
    then: (resolve: (v: any) => void) => resolve(respostas[indice++]),
  };
  return builder;
}

describe('GuardioesService', () => {
  let service: GuardioesService;

  beforeEach(() => {
    service = new GuardioesService();
  });

  describe('cadastrar', () => {
    it('recusa cadastro quando a usuária já tem 5 guardiãs (RN02)', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: [{}, {}, {}, {}, {}], error: null },
      ]);

      await expect(
        service.cadastrar({ usuaria_id: 'u1', nome_completo: 'G', telefone: '111' }),
      ).rejects.toMatchObject({
        response: { erro: 'Limite máximo de 5 guardiões atingido.' },
      });
    });

    it('cadastra normalmente quando há menos de 5 guardiãs', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: [{}, {}], error: null },
        { data: [{ id: 'g1' }], error: null },
      ]);

      const resultado = await service.cadastrar({
        usuaria_id: 'u1',
        nome_completo: 'Guardiã',
        telefone: '11999998888',
      });

      expect(resultado).toEqual({ mensagem: 'Guardião cadastrado com sucesso!' });
    });
  });

  describe('remover', () => {
    it('recusa remover a última guardiã (RN03)', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: { usuaria_id: 'u1' }, error: null },
        { count: 1, error: null },
      ]);

      await expect(service.remover('g1', 'u1')).rejects.toMatchObject({
        response: { erro: 'Operação não permitida: a usuária precisa possuir pelo menos uma guardiã.' },
      });
    });

    it('recusa remover guardiã de outra usuária (isolamento entre contas)', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: { usuaria_id: 'dona-real' }, error: null },
      ]);

      await expect(service.remover('g1', 'invasora')).rejects.toMatchObject({
        response: { erro: 'Acesso Negado.' },
      });
    });

    it('permite remover quando há mais de uma guardiã', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: { usuaria_id: 'u1' }, error: null },
        { count: 2, error: null },
        { error: null },
      ]);

      const resultado = await service.remover('g1', 'u1');
      expect(resultado).toEqual({ mensagem: 'Guardiã removida com sucesso!' });
    });
  });

  describe('atualizar', () => {
    it('recusa atualizar guardiã que não existe', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: null, error: { message: 'not found' } },
      ]);

      await expect(
        service.atualizar('g-inexistente', { nome_completo: 'X' }, 'u1'),
      ).rejects.toBeInstanceOf(HttpException);
    });

    it('recusa atualizar guardiã de outra usuária', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: { usuaria_id: 'dona-real' }, error: null },
      ]);

      await expect(
        service.atualizar('g1', { nome_completo: 'X' }, 'invasora'),
      ).rejects.toMatchObject({ response: { erro: 'Acesso Negado.' } });
    });
  });
});
