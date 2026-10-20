import { IsEmail, IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { SenhaForte } from '../../../utils/validadores';

export const CANAIS_RECUPERACAO = ['email', 'sms'] as const;
export type CanalRecuperacao = (typeof CANAIS_RECUPERACAO)[number];

export class PedirRecuperacaoDto {
  @IsEmail({}, { message: 'Esse e-mail não parece válido.' })
  @MaxLength(254)
  email: string;

  @IsIn(CANAIS_RECUPERACAO, { message: 'Escolha receber o código por e-mail ou por SMS.' })
  canal: CanalRecuperacao;
}

export class RedefinirSenhaDto {
  @IsEmail({}, { message: 'Esse e-mail não parece válido.' })
  @MaxLength(254)
  email: string;

  @Matches(/^\d{6}$/, { message: 'O código tem 6 números.' })
  codigo: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @SenhaForte()
  nova_senha: string;
}
