import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertEstoqueDto {
  @IsString()
  medicamentoId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantidade?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minimo?: number;
}
