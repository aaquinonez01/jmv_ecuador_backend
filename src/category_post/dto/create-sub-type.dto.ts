import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateSubtypeDto {
  @IsString()
  @IsNotEmpty()
  activityTypeId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsNumber()
  @IsOptional()
  order?: number;
}
