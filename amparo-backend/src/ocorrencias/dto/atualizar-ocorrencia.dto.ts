import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { NaoPodeSerFutura } from '../../common/validadores';
import { TIPOS_VIOLENCIA } from './criar-ocorrencia.dto';

export class AtualizarOcorrenciaDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsIn(TIPOS_VIOLENCIA, { each: true })
  tipos_violencia?: string[];

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  mensagem?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  @NaoPodeSerFutura()
  data_ocorrencia?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
