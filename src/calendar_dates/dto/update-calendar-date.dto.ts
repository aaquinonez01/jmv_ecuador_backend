import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCalendarDateDto } from './create-calendar-date.dto';

export class UpdateCalendarDateDto extends PartialType(CreateCalendarDateDto) {
  // "true" quita la imagen actual (y la borra de Cloudinary si se subió allí)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? ['true', '1', 'on'].includes(value.trim().toLowerCase())
      : value,
  )
  @IsBoolean()
  removeImage?: boolean;
}
