import { IsString, IsOptional } from 'class-validator';

export class UpdateAgendamentoDto {
  @IsOptional()
  @IsString()
  pacienteId?: string;

  @IsOptional()
  @IsString()
  usuarioId?: string;

  @IsOptional()
  @IsString()
  data?: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  observacoes?: string | null;
}
