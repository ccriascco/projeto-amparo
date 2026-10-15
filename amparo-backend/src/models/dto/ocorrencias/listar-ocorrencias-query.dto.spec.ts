import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListarOcorrenciasQueryDto } from './listar-ocorrencias-query.dto';

async function erros(query: Record<string, unknown>) {
  const dto = plainToInstance(ListarOcorrenciasQueryDto, query);
  return (await validate(dto)).map((e) => e.property);
}

describe('ListarOcorrenciasQueryDto', () => {
  it('aceita paginação válida', async () => {
    expect(await erros({ limit: '20', offset: '40' })).toEqual([]);
  });

  it('recusa offset gigante que estouraria o bigint do Postgres', async () => {
    expect(await erros({ offset: '99999999999999999999' })).toContain('offset');
  });

  it('recusa limit acima de 100', async () => {
    expect(await erros({ limit: '500' })).toContain('limit');
  });

  it('recusa limit negativo', async () => {
    expect(await erros({ limit: '-5' })).toContain('limit');
  });
});
