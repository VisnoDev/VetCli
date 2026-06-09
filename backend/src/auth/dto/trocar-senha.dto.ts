import { IsString, MinLength } from 'class-validator';

export class TrocarSenhaDto {
  @IsString()
  senhaAtual: string;

  @IsString()
  @MinLength(8, { message: 'Nova senha deve ter pelo menos 8 caracteres' })
  novaSenha: string;
}
