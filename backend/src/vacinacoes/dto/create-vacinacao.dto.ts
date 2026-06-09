import { IsString, IsOptional } from 'class-validator';

export class CreateVacinacaoDto {
  @IsString()
  pacienteId: string;

  @IsString()
  vacina: string;

  @IsOptional()
  @IsString()
  fabricante?: string;

  @IsOptional()
  @IsString()
  lote?: string;

  @IsString()
  dataAplicacao: string;

  @IsOptional()
  @IsString()
  dataVencimento?: string;
}
