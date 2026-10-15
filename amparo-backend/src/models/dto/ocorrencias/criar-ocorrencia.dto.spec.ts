import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CriarOcorrenciaDto } from './criar-ocorrencia.dto';

async function erros(body: Record<string, unknown>) {
  const dto = plainToInstance(CriarOcorrenciaDto, { tipos_violencia: ['Física'], ...body });
  return (await validate(dto)).map((e) => e.property);
}

describe('CriarOcorrenciaDto', () => {
  it('aceita tipos da lista oficial', async () => {
    expect(await erros({ tipos_violencia: ['Física', 'Psicológica', 'Ameaça'] })).toEqual([]);
  });

  it('recusa tipo fora da lista (a IA ignoraria em silêncio)', async () => {
    expect(await erros({ tipos_violencia: ['TipoInventado'] })).toContain('tipos_violencia');
  });

  it('aceita latitude 0 e longitude 0', async () => {
    expect(await erros({ latitude: 0, longitude: 0 })).toEqual([]);
  });
});
