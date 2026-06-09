import { IsString, IsOptional } from 'class-validator';

export class UpdateAtendimentoDto {
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
