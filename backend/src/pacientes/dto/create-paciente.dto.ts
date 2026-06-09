import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePacienteDto {
  @IsString()
  nome: string;

  @IsString()
  especie: string;

  @IsOptional()
  @IsString()
  raca?: string;

  @IsOptional()
  @IsString()
  sexo?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  peso?: number;

  @IsOptional()
  @IsString()
  dataNasc?: string;

  @IsOptional()
  @IsString()
  alergias?: string;

  @IsString()
  tutorId: string;
}
