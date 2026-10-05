import { IsString, MaxLength, MinLength } from 'class-validator';

export class ExcluirContaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  senha: string;
}
