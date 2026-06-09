import { IsString, IsNumber, IsOptional, IsIn, Min } from 'class-validator';

export class UpdateCobrancaDto {
  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valor?: number;

  @IsOptional()
  @IsString()
  @IsIn(['DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'CONVENIO'])
  formaPagamento?: string;

  @IsOptional()
  @IsString()
  @IsIn(['PENDENTE', 'PAGO', 'CANCELADO'])
  status?: string;

  @IsOptional()
  @IsString()
  dataPagamento?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
