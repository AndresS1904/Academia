import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1)
  identifier: string; // correo electrónico o número de documento

  @IsString()
  @MinLength(6)
  password: string;
}
