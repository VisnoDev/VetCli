import { IsString, MinLength } from 'class-validator';

export class UpdateSenhaDto {
  @IsString()
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  senha: string;
}
