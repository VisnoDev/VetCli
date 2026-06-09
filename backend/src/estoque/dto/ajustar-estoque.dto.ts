import { IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AjustarEstoqueDto {
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

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  delta?: number;
}
