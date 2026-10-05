import { OcorrenciasService } from './ocorrencias.service';

function criarSupabaseFake(respostas: any[]) {
  let indice = 0;
  const builder: any = {
    from: jest.fn(() => builder),
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    order: jest.fn(() => builder),
    range: jest.fn(() => builder),
    gte: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    single: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    // oxlint-disable-next-line unicorn/no-thenable
    then: (resolve: (v: any) => void) => resolve(respostas[indice++]),
  };
  return builder;
}

describe('OcorrenciasService', () => {
  let service: OcorrenciasService;

  beforeEach(() => {
    service = new OcorrenciasService();
  });

  describe('anexarEvidencia', () => {
    it('recusa anexar evidência a uma ocorrência que não existe', async () => {
      (service as any).supabase = criarSupabaseFake([{ data: null, error: { message: 'not found' } }]);

      await expect(
        service.anexarEvidencia('oc-inexistente', 'IMAGE', { mimetype: 'image/jpeg', size: 1024 }, 'u1'),
      ).rejects.toMatchObject({ response: { erro: 'Ocorrência não encontrada.' } });
    });

    it('recusa anexar evidência a ocorrência de outra usuária (isolamento entre contas)', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: { id: 'oc1', usuaria_id: 'dona-real' }, error: null },
      ]);

      await expect(
        service.anexarEvidencia('oc1', 'IMAGE', { mimetype: 'image/jpeg', size: 1024 }, 'invasora'),
      ).rejects.toMatchObject({
        response: { erro: 'Acesso Negado: Esta ocorrência não pertence a você.' },
      });
    });

    it('recusa arquivo cujo conteúdo não corresponde ao mimetype declarado', async () => {
      (service as any).supabase = criarSupabaseFake([{ data: { id: 'oc1', usuaria_id: 'u1' }, error: null }]);

      await expect(
        service.anexarEvidencia(
          'oc1',
          'IMAGE',
          { mimetype: 'image/jpeg', size: 1024, buffer: Buffer.from('MZ\x90\x00', 'binary') },
          'u1',
        ),
      ).rejects.toMatchObject({ status: 415 });
    });

    it('remove o arquivo do Storage se o registro na tabela evidencias falhar (sem arquivo órfão)', async () => {
      const remove = jest.fn().mockResolvedValue({ error: null });
      const upload = jest.fn().mockResolvedValue({ error: null });
      const fake: any = criarSupabaseFake([
        { data: { id: 'oc1', usuaria_id: 'u1' }, error: null },
        { data: null, error: { message: 'falha de insert' } },
      ]);
      fake.storage = { from: () => ({ upload, remove }) };
      (service as any).supabase = fake;

      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
      await expect(
        service.anexarEvidencia('oc1', 'IMAGE', { mimetype: 'image/jpeg', size: jpeg.length, buffer: jpeg }, 'u1'),
      ).rejects.toBeDefined();

      expect(upload).toHaveBeenCalled();
      expect(remove).toHaveBeenCalledWith([expect.stringMatching(/^u1\/oc1\/.+\.jpg$/)]);
    });

    it('recusa foto acima de 5MB (RN04)', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: { id: 'oc1', usuaria_id: 'u1' }, error: null },
      ]);

      await expect(
        service.anexarEvidencia(
          'oc1',
          'IMAGE',
          { mimetype: 'image/jpeg', size: 6 * 1024 * 1024 },
          'u1',
        ),
      ).rejects.toMatchObject({ response: { erro: 'Fotos não podem exceder 5MB.' } });
    });

    it('recusa vídeo acima de 20MB (RN04)', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: { id: 'oc1', usuaria_id: 'u1' }, error: null },
      ]);

      await expect(
        service.anexarEvidencia(
          'oc1',
          'VIDEO',
          { mimetype: 'video/mp4', size: 21 * 1024 * 1024 },
          'u1',
        ),
      ).rejects.toMatchObject({ response: { erro: 'Vídeos não podem exceder 20MB.' } });
    });
  });

  describe('criar com coordenadas zeradas', () => {
    it('preserva latitude 0 e longitude 0 (são coordenadas válidas, não ausência de dados)', async () => {
      const fake = criarSupabaseFake([
        { data: [], error: null },
        { data: [{ id: 'oc0', latitude: 0, longitude: 0 }], error: null },
      ]);
      (service as any).supabase = fake;
      jest.spyOn(service as any, 'avaliarRiscoUsuaria').mockResolvedValue(undefined);

      await service.criar({ usuaria_id: 'u1', tipos_violencia: ['Física'], latitude: 0, longitude: 0 });

      expect(fake.insert).toHaveBeenCalledWith([
        expect.objectContaining({ latitude: 0, longitude: 0 }),
      ]);
    });
  });

  describe('criar: reenvio idêntico (D7)', () => {
    it('recusa ocorrência idêntica criada há instantes pela mesma usuária', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: [{ tipos_violencia: ['Física'], mensagem: 'agora' }], error: null },
      ]);

      await expect(
        service.criar({ usuaria_id: 'u1', tipos_violencia: ['Física'], mensagem: 'agora' }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('aceita ocorrência com tipos diferentes mesmo na mesma janela', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: [{ tipos_violencia: ['Física'], mensagem: 'x' }], error: null },
        { data: [{ id: 'oc2' }], error: null },
      ]);
      jest.spyOn(service as any, 'avaliarRiscoUsuaria').mockResolvedValue(undefined);

      await expect(
        service.criar({ usuaria_id: 'u1', tipos_violencia: ['Sexual'], mensagem: 'x' }),
      ).resolves.toMatchObject({ mensagem: 'Ocorrência registrada com sucesso!' });
    });
  });

  describe('remover', () => {
    it('apaga também os arquivos da ocorrência no Storage (sem órfãos)', async () => {
      const remove = jest.fn().mockResolvedValue({ error: null });
      const fake: any = criarSupabaseFake([
        { data: { usuaria_id: 'u1' }, error: null },
        { data: [{ caminho_storage: 'u1/oc1/a.jpg' }, { caminho_storage: 'u1/oc1/b.mp4' }], error: null },
        { data: [{ id: 'oc1' }], error: null },
      ]);
      fake.storage = { from: () => ({ remove }) };
      (service as any).supabase = fake;

      await service.remover('oc1', 'u1');

      expect(remove).toHaveBeenCalledWith(['u1/oc1/a.jpg', 'u1/oc1/b.mp4']);
    });

    it('recusa remover ocorrência de outra usuária', async () => {
      (service as any).supabase = criarSupabaseFake([
        { data: { usuaria_id: 'dona-real' }, error: null },
      ]);

      await expect(service.remover('oc1', 'invasora')).rejects.toMatchObject({
        response: { erro: 'Acesso Negado.' },
      });
    });
  });

  describe('listarPorUsuaria (paginação - P12)', () => {
    it('repassa limit/offset pro supabase e devolve o total', async () => {
      const fake = criarSupabaseFake([{ data: [{ id: 'oc1' }], count: 7, error: null }]);
      (service as any).supabase = fake;

      const resultado = await service.listarPorUsuaria('u1', 2, 4);

      expect(resultado).toEqual({ ocorrencias: [{ id: 'oc1' }], total: 7, limit: 2, offset: 4 });
    });
  });
});
