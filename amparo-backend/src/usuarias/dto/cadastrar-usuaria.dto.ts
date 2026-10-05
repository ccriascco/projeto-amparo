import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
  ValidateBy,
  ValidateNested,
  buildMessage,
} from 'class-validator';
import { NaoPodeSerFutura, SenhaForte, TelefonesSemRepeticao } from '../../common/validadores';

function cpfEhValido(cpf: unknown): boolean {
  if (typeof cpf !== 'string' || !/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base: string, pesoInicial: number) => {
    const soma = [...base].reduce((acc, d, i) => acc + Number(d) * (pesoInicial - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(cpf.slice(0, 9), 10) === Number(cpf[9]) && digito(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

function CpfValido() {
  return ValidateBy({
    name: 'cpfValido',
    validator: {
      validate: (valor) => cpfEhValido(valor),
      defaultMessage: buildMessage(() => 'CPF inválido. Confira os números informados (com ou sem pontos e traço).'),
    },
  });
}

function SenhaDisfarceDiferente() {
  return ValidateBy({
    name: 'senhaDisfarceDiferente',
    validator: {
      validate: (valor, args) => valor !== (args?.object as { senha?: string })?.senha,
      defaultMessage: buildMessage(() => 'senha_app não pode ser igual à senha'),
    },
  });
}

export class GuardiaoCadastroDto {
  @IsString()
  @Length(2, 150)
  nome_completo: string;

  @IsString()
  @Length(8, 20)
  telefone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  parentesco_relacao?: string;
}

export class CadastrarUsuariaDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  @CpfValido()
  cpf: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 20)
  telefone: string;

  @IsString()
  @Length(2, 150)
  nome_completo: string;

  @IsDateString()
  @NaoPodeSerFutura()
  data_nascimento: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @SenhaForte()
  senha: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @SenhaDisfarceDiferente()
  senha_app: string;

  @IsOptional()
  @IsBoolean()
  modo_disfarcado?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => GuardiaoCadastroDto)
  @TelefonesSemRepeticao()
  guardioes: GuardiaoCadastroDto[];
}
