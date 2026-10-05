import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export const TIPOS_VIOLENCIA = [
  'Física',
  'Psicológica',
  'Sexual',
  'Patrimonial',
  'Moral',
  'Ameaça',
] as const;

export class CriarOcorrenciaDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsIn(TIPOS_VIOLENCIA, { each: true })
  tipos_violencia: string[];

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  mensagem?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
