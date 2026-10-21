import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

export class FilterTestimonialsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  active?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
