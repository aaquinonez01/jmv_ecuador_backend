import { PartialType } from '@nestjs/mapped-types';
import { CreateActivityTypeDto } from './activity-type.entity.dto';

export class UpdateActivityTypeDto extends PartialType(CreateActivityTypeDto) {}
