import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

export class FilterPostsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  activityType?: string;

  @IsOptional()
  @IsString()
  subtype?: string;

  @IsOptional()
  @IsString()
  @IsIn(['moments', 'documents'])
  typePost?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

