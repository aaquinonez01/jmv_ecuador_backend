import { PickType } from '@nestjs/mapped-types';
import { IsHexadecimal, IsString, Length } from 'class-validator';
import { RegisterUserDto } from './register-user.dto';

// Misma política de contraseña que el registro
export class ResetPasswordDto extends PickType(RegisterUserDto, [
  'password',
] as const) {
  @IsString()
  @IsHexadecimal({ message: 'El enlace no es válido' })
  @Length(64, 64, { message: 'El enlace no es válido' })
  token: string;
}
