import { PartialType } from '@nestjs/mapped-types';
import { CreateUpcomingActivityDto } from './create-upcoming-activity.dto';

export class UpdateUpcomingActivityDto extends PartialType(
  CreateUpcomingActivityDto,
) {}
