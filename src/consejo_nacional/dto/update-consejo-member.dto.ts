import { PartialType } from '@nestjs/mapped-types';
import { CreateConsejoMemberDto } from './create-consejo-member.dto';

export class UpdateConsejoMemberDto extends PartialType(
  CreateConsejoMemberDto,
) {}
