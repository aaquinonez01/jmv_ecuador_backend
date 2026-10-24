import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsEmail({}, { message: 'Escribe un correo electrónico válido' })
  @MaxLength(254, { message: 'El correo es demasiado largo' })
  email: string;
}
