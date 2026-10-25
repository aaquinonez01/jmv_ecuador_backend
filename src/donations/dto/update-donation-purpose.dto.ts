import { PartialType } from '@nestjs/mapped-types';
import { CreateDonationPurposeDto } from './create-donation-purpose.dto';
import { RemoveFlag } from './donation-transforms';

export class UpdateDonationPurposeDto extends PartialType(
  CreateDonationPurposeDto,
) {
  // "true" quita la imagen actual (y la borra de Cloudinary si se subió allí)
  @RemoveFlag()
  removeImage?: boolean;
}
