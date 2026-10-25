import { PartialType } from '@nestjs/mapped-types';
import { CreateStatuteVersionDto } from './create-statute-version.dto';

export class UpdateStatuteVersionDto extends PartialType(
  CreateStatuteVersionDto,
) {}
