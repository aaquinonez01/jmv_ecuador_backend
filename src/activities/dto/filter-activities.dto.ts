import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

export class FilterActivitiesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  pillarId?: string;

  @IsOptional()
  @IsString()
  typeId?: string;

  @IsOptional()
  @IsString()
  published?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
