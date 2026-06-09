import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegistrarDto {
  @IsString()
  @MinLength(2, { message: 'Nome da clínica deve ter pelo menos 2 caracteres' })
  clinicaNome: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'E-mail da clínica inválido' })
  clinicaEmail?: string;

  @IsString()
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  adminNome: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  adminEmail: string;

  @IsString()
  @MinLength(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
  adminSenha: string;
}
