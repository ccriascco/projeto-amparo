import { IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { CodigoDisfarce } from '../../common/validadores';

export class RenovarSessaoDto {
  @IsString()
  @Length(20, 200)
  refresh_token: string;

  // Exigido quando o Modo Disfarce está ligado
  @IsOptional()
  @CodigoDisfarce()
  codigo?: string;
}

export class LoginGoogleDto {
  @IsString()
  @MaxLength(4096)
  id_token: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  @Length(20, 200)
  refresh_token?: string;
}
