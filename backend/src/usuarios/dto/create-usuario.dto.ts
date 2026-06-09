import { IsString, IsEmail, IsEnum, IsOptional, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUsuarioDto {
  @IsString()
  nome: string;

  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  senha: string;

  @IsEnum(Role, { message: 'Role inválida' })
  role: Role;

  @IsOptional()
  @IsString()
  clinicaId?: string;
}
