import {
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterUserDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @Matches(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'La contraseña debe tener una letra mayúscula, una letra minúscula y un número',
  })
  password: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  fullName: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  @MinLength(3)
  displayName: string;

  @IsOptional()
  @IsString()
  @IsOptional()
  profilePicture: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  @MinLength(3)
  role: string;

  @IsNotEmpty()
  @IsDate()
  birthDate: Date;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  @MinLength(10, { message: 'El teléfono debe tener 10 dígitos' })
  phoneNumber: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  @MinLength(3)
  address: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  @MinLength(3)
  bio: string;
}
