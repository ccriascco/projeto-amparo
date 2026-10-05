import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class AtualizarGuardiaoDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  nome_completo?: string;

  @IsOptional()
  @IsString()
  @Length(8, 20)
  telefone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  parentesco_relacao?: string;
}
