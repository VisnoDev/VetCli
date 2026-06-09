import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Role inválida' })
  role?: Role;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
