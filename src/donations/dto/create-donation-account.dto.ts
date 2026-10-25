import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {
  maxLength,
  optionalText,
  toBool,
  toInt,
  trimText,
} from 'src/library/dto/transforms';
import {
  DONATION_ACCOUNT_TYPES,
  type DonationAccountType,
} from '../entities/donation-account.entity';
import { compactText } from './donation-transforms';

export class CreateDonationAccountDto {
  @Transform(trimText)
  @IsString({ message: 'El banco es obligatorio' })
  @MinLength(2, { message: 'El banco debe tener al menos 2 caracteres' })
  @maxLength('El banco', 120)
  bankName!: string;

  @Transform(trimText)
  @IsIn(DONATION_ACCOUNT_TYPES, {
    message: 'El tipo de cuenta debe ser "ahorros" o "corriente"',
  })
  accountType!: DonationAccountType;

  @Transform(compactText)
  @IsString({ message: 'El número de cuenta es obligatorio' })
  @Matches(/^\d+(?:-\d+)*$/, {
    message: 'El número de cuenta solo puede tener dígitos y guiones',
  })
  @MinLength(4, {
    message: 'El número de cuenta debe tener al menos 4 caracteres',
  })
  @maxLength('El número de cuenta', 40)
  accountNumber!: string;

  @Transform(trimText)
  @IsString({ message: 'El titular es obligatorio' })
  @MinLength(3, { message: 'El titular debe tener al menos 3 caracteres' })
  @maxLength('El titular', 150)
  holderName!: string;

  // Cédula (10 dígitos) o RUC (13 dígitos)
  @IsOptional()
  @Transform(compactText)
  @IsString()
  @Matches(/^(\d{10}|\d{13})$/, {
    message: 'La cédula debe tener 10 dígitos o el RUC 13 dígitos',
  })
  holderId?: string | null;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('El cargo del titular', 120)
  holderRole?: string | null;

  @IsOptional()
  @Transform(optionalText)
  @IsEmail({}, { message: 'Escribe un correo electrónico válido' })
  @maxLength('El correo', 150)
  email?: string | null;

  @IsOptional()
  @Transform(optionalText)
  @IsString()
  @maxLength('Las notas', 1000)
  notes?: string | null;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;

  @IsOptional()
  @Transform(toInt)
  @IsInt({ message: 'El orden debe ser un número entero' })
  @Min(0, { message: 'El orden debe estar entre 0 y 9999' })
  @Max(9999, { message: 'El orden debe estar entre 0 y 9999' })
  displayOrder?: number | null;
}
