import { PartialType } from '@nestjs/mapped-types';
import { CreateSiteImageDto } from './create-site-image.dto';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateSiteImageDto extends PartialType(CreateSiteImageDto) {
  @IsInt()
  @IsOptional()
  orden?: number;
}

