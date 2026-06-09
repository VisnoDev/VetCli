import { IsString } from 'class-validator';

export class AtualizarStatusDto {
  @IsString()
  status: string;
}
