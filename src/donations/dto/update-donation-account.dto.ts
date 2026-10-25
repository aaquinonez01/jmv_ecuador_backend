import { PartialType } from '@nestjs/mapped-types';
import { CreateDonationAccountDto } from './create-donation-account.dto';

export class UpdateDonationAccountDto extends PartialType(
  CreateDonationAccountDto,
) {}
