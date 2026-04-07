import { PartialType } from '@nestjs/mapped-types';
import { CreateActivityPillarDto } from './create-activity-pillar.dto';

export class UpdateActivityPillarDto extends PartialType(
  CreateActivityPillarDto,
) {}
