import { IsString, IsOptional } from 'class-validator';

export class CreateAtendimentoDto {
  @IsString()
  pacienteId: string;

  @IsOptional()
  @IsString()
  queixa?: string;

  @IsOptional()
  @IsString()
  diagnostico?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
