import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateLibraryDocumentDto } from './create-library-document.dto';
import { toBool } from './transforms';

export class UpdateLibraryDocumentDto extends PartialType(
  CreateLibraryDocumentDto,
) {
  // "true" quita el PDF actual y lo borra del disco
  @IsOptional()
  @Transform(toBool)
  @IsBoolean({ message: 'removeFile debe ser true o false' })
  removeFile?: boolean;

  // "true" quita la portada (y la borra de Cloudinary si se subió allí)
  @IsOptional()
  @Transform(toBool)
  @IsBoolean({ message: 'removeCover debe ser true o false' })
  removeCover?: boolean;
}
