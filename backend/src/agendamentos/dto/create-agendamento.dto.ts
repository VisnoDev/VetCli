import { IsString, IsOptional } from 'class-validator';

export class CreateAgendamentoDto {
  @IsString()
  pacienteId: string;

  @IsOptional()
  @IsString()
  usuarioId?: string;

  @IsString()
  data: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
