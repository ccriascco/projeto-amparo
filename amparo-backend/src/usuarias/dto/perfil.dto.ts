import { IsBoolean, IsEmail, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { CodigoDisfarce, SenhaForte } from '../../common/validadores';

export class AtualizarPerfilDto {
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
  @IsBoolean()
  modo_disfarcado?: boolean;

  // Para ligar o disfarce pela primeira vez, junto com modo_disfarcado: true
  @IsOptional()
  @CodigoDisfarce()
  codigo_disfarce?: string;
}

export class TrocarSenhaDto {
  // Opcional só para contas criadas pelo Google que ainda não têm senha
  @IsOptional()
  @IsString()
  @MaxLength(72)
  senha_atual?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @SenhaForte()
  nova_senha: string;
}

export class TrocarCodigoDto {
  @IsOptional()
  @CodigoDisfarce()
  codigo_atual?: string;

  @CodigoDisfarce()
  codigo_novo: string;
}
