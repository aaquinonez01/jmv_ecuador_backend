import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

export class FilterUpcomingActivitiesDto extends PaginationDto {
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
  showInHome?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
