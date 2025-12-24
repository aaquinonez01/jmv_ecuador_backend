import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateSubtypeDto } from './create-sub-type.dto';

export class UpdateSubtypeDto extends PartialType(
  OmitType(CreateSubtypeDto, ['activityTypeId'] as const),
) {}
