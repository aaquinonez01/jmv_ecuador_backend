import { PartialType } from '@nestjs/mapped-types';
import { CreateDonationCampaignDto } from './create-donation-campaign.dto';
import { RemoveFlag } from './donation-transforms';

export class UpdateDonationCampaignDto extends PartialType(
  CreateDonationCampaignDto,
) {
  // "true" quita la imagen actual (y la borra de Cloudinary si se subió allí)
  @RemoveFlag()
  removeImage?: boolean;
}
