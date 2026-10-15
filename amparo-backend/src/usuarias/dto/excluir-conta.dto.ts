import { IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class ExcluirContaDto {
  // Contas com senha confirmam com a senha; contas só do Google, com um id_token novo do Google
  @ValidateIf((o) => !o.google_id_token)
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  senha?: string;

  @ValidateIf((o) => !o.senha)
  @IsString()
  @MaxLength(4096)
  google_id_token?: string;
}
