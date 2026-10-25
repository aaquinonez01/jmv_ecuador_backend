import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

type Raw = { value: unknown };

// Se espera punto decimal (como envía un input number): "1234.50"
export const toAmount = ({ value }: Raw) => {
  if (value === undefined || value === null) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
};

// Quita espacios: "2200 1234-56" -> "22001234-56"
export const compactText = ({ value }: Raw) => {
  if (typeof value !== 'string') return value;
  const compact = value.replace(/\s+/g, '');
  return compact === '' ? null : compact;
};

// Deja solo dígitos con código de país. Un celular local (09...) pasa a 5939...
export const toWhatsapp = ({ value }: Raw) => {
  if (typeof value !== 'string') return value;
  const digits = value.replace(/[\s()+.-]/g, '');
  if (digits === '') return null;
  if (/^0\d{9}$/.test(digits)) return `593${digits.slice(1)}`;
  return digits;
};

export const IMAGE_URL_PATTERN = /^(\/images\/|https:\/\/)\S+$/;
export const IMAGE_URL_MESSAGE =
  'La imagen debe ser una ruta /images/... o una URL https';

const toTrue = ({ value }: Raw) =>
  typeof value === 'string'
    ? ['true', '1', 'on'].includes(value.trim().toLowerCase())
    : value;

// Campo "removeImage"/"removeQr": "true" quita la imagen actual
export function RemoveFlag(): PropertyDecorator {
  return (target, propertyKey) => {
    IsOptional()(target, propertyKey);
    Transform(toTrue)(target, propertyKey);
    IsBoolean()(target, propertyKey);
  };
}

export const WhatsappNumber = () =>
  Matches(/^\d{9,15}$/, {
    message:
      'El WhatsApp debe tener entre 9 y 15 dígitos con el código de país (p. ej. 593991234567)',
  });

// decimal(12,2) no negativo
const MAX_AMOUNT = 9_999_999_999.99;

export function AmountField(field: string): PropertyDecorator {
  return (target, propertyKey) => {
    IsOptional()(target, propertyKey);
    Transform(toAmount)(target, propertyKey);
    IsNumber(
      { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
      { message: `${field} debe ser un número con hasta 2 decimales` },
    )(target, propertyKey);
    Min(0, { message: `${field} no puede ser negativo` })(target, propertyKey);
    Max(MAX_AMOUNT, { message: `${field} es demasiado alto` })(
      target,
      propertyKey,
    );
  };
}
