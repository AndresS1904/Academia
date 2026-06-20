import { IsEmail } from 'class-validator';

export class SubscribeDto {
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  email: string;
}
