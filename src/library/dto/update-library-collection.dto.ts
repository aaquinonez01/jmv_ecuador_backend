import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateLibraryCollectionDto } from './create-library-collection.dto';
import { toBool } from './transforms';

export class UpdateLibraryCollectionDto extends PartialType(
  CreateLibraryCollectionDto,
) {
  @IsOptional()
  @Transform(toBool)
  @IsBoolean({ message: 'removeCover debe ser true o false' })
  removeCover?: boolean;
}
