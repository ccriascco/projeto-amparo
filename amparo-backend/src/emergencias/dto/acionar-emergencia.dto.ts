import { IsLatitude, IsLongitude, IsOptional, IsUUID } from 'class-validator';

export class AcionarEmergenciaDto {
  @IsOptional()
  @IsUUID()
  usuaria_id?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
