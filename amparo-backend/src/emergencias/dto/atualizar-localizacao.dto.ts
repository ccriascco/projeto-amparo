import { IsLatitude, IsLongitude } from 'class-validator';

export class AtualizarLocalizacaoDto {
  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;
}
