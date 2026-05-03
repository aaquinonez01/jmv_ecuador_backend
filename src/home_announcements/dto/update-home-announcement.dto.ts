import { PartialType } from '@nestjs/mapped-types';
import { CreateHomeAnnouncementDto } from './create-home-announcement.dto';

export class UpdateHomeAnnouncementDto extends PartialType(
  CreateHomeAnnouncementDto,
) {}
