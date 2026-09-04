import { IsString, MinLength } from 'class-validator';

export class GoogleLoginDto {
  /** ID token (JWT) devolvido pelo botão do Google Identity Services */
  @IsString()
  @MinLength(20)
  credential: string;
}
