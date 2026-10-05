import { EmergenciasService } from './emergencias.service';

function criarSupabaseFake(respostas: any[]) {
  let indice = 0;
  const builder: any = {
    from: jest.fn(() => builder),
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    order: jest.fn(() => builder),
    single: jest.fn(() => builder),
    // oxlint-disable-next-line unicorn/no-thenable
    then: (resolve: (v: any) => void) => resolve(respostas[indice++]),
  };
  return builder;
}

describe('EmergenciasService', () => {
  let service: EmergenciasService;

  beforeEach(() => {
    service = new EmergenciasService();
  });

  describe('acionar', () => {
    it('recusa acionar emergência para outra usuária (anti-falsidade de identidade)', async () => {
      await expect(
        service.acionar({ usuaria_id: 'vitima-b' }, 'usuaria-autenticada-a'),
      ).rejects.toMatchObject({
        response: { erro: 'Acesso Negado: Você não pode acionar emergência para outra usuária.' },
      });
    });

    it('recusa acionar quando já existe uma emergência ATIVA (RN06, anti-duplicidade)', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: [{ id: 'emergencia-ativa-1' }], error: null },
      ]);

      await expect(service.acionar({ usuaria_id: 'u1' }, 'u1')).rejects.toMatchObject({
        status: 409,
      });
    });

    it('aciona com sucesso e sinaliza quando não há guardiãs cadastradas', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: [], error: null }, // sem emergência ativa
        { data: { id: 'nova-emergencia' }, error: null }, // insert da emergência
        { data: [], error: null }, // guardiões (nenhum)
      ]);

      const resultado = await service.acionar({ usuaria_id: 'u1' }, 'u1');

      expect(resultado.status_notificacao).toBe('ALERTA_FALHA_SEM_GUARDIOES');
      expect(resultado.guardioes_notificados).toBe(0);
    });

    it('aciona com sucesso e notifica as guardiãs cadastradas', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: [], error: null },
        { data: { id: 'nova-emergencia' }, error: null },
        { data: [{ nome_completo: 'Guardiã 1', telefone: '11999998888' }], error: null },
      ]);

      const resultado = await service.acionar({ usuaria_id: 'u1' }, 'u1');

      expect(resultado.status_notificacao).toBe('SUCESSO');
      expect(resultado.guardioes_notificados).toBe(1);
    });
  });

  describe('acionar em nome de outra usuária (EM-12)', () => {
    it('responde 403 quando o usuaria_id do corpo é de outra usuária', async () => {
      await expect(service.acionar({ usuaria_id: 'outra' }, 'eu')).rejects.toMatchObject({ status: 403 });
    });

    it('aceita quando o usuaria_id do corpo é a própria usuária autenticada', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: [], error: null },
        { data: { id: 'e9' }, error: null },
        { data: [], error: null },
      ]);
      await expect(service.acionar({ usuaria_id: 'eu' }, 'eu')).resolves.toMatchObject({ emergencia_id: 'e9' });
    });
  });

  describe('acionar com coordenadas zeradas', () => {
    it('grava o ponto GPS inicial mesmo quando latitude/longitude são 0 (equador/meridiano)', async () => {
      const fake = criarSupabaseFake([
        { data: [], error: null },
        { data: { id: 'e0' }, error: null },
        { data: null, error: null },
        { data: [], error: null },
      ]);
      (service as any).supabase = fake;

      await service.acionar({ usuaria_id: 'u1', latitude: 0, longitude: 0 }, 'u1');

      const chamadasRastreamento = fake.from.mock.calls.filter((c: any[]) => c[0] === 'rastreamento_gps');
      expect(chamadasRastreamento).toHaveLength(1);
    });
  });

  describe('encerrar', () => {
    it('recusa encerrar uma emergência que já foi encerrada (não sobrescreve encerrado_em)', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: { id: 'e1', usuaria_id: 'u1', status: 'ENCERRADA' }, error: null },
      ]);

      await expect(service.encerrar('e1', 'u1')).rejects.toMatchObject({
        response: { erro: 'Emergência já foi encerrada.' },
      });
    });
  });

  describe('atualizarLocalizacao', () => {
    it('recusa atualizar emergência que não pertence à usuária autenticada', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: { id: 'e1', usuaria_id: 'dona-real', status: 'ATIVA' }, error: null },
      ]);

      await expect(
        service.atualizarLocalizacao('e1', { latitude: 1, longitude: 2 }, 'invasora'),
      ).rejects.toMatchObject({ response: { erro: 'Acesso Negado.' } });
    });

    it('recusa atualizar localização de emergência já encerrada', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: { id: 'e1', usuaria_id: 'u1', status: 'ENCERRADA' }, error: null },
      ]);

      await expect(
        service.atualizarLocalizacao('e1', { latitude: 1, longitude: 2 }, 'u1'),
      ).rejects.toMatchObject({ response: { erro: 'Emergência não está ativa.' } });
    });
  });
});
