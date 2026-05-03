import { PartialType } from '@nestjs/mapped-types';
import { CreateConsejoPeriodDto } from './create-consejo-period.dto';

export class UpdateConsejoPeriodDto extends PartialType(
  CreateConsejoPeriodDto,
) {}
