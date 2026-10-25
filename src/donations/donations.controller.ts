import {
  Body,
  Controller,
  Get,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { siteImagesMulterConfig } from 'src/site_images/config/multer.config';
import { DonationAccountsService } from './donation-accounts.service';
import { DonationCampaignsService } from './donation-campaigns.service';
import { DonationPurposesService } from './donation-purposes.service';
import { DonationSettingsService } from './donation-settings.service';
import { UpdateDonationSettingsDto } from './dto/update-donation-settings.dto';
import { mapSettings } from './donations.shared';

@Controller('donations')
export class DonationsController {
  constructor(
    private readonly settings: DonationSettingsService,
    private readonly accounts: DonationAccountsService,
    private readonly purposes: DonationPurposesService,
    private readonly campaigns: DonationCampaignsService,
  ) {}

  // Todo lo que muestra /donar en una sola llamada
  @Get('public')
  async findPublic() {
    const [settings, accounts, purposes, campaigns] = await Promise.all([
      this.settings.getOrCreate(),
      this.accounts.findActive(),
      this.purposes.findActive(),
      this.campaigns.findActive(),
    ]);
    return { settings: mapSettings(settings), accounts, purposes, campaigns };
  }

  @Get('settings')
  @Auth(ValidRoles.ADMIN)
  findSettings() {
    return this.settings.find();
  }

  @Patch('settings')
  @Auth(ValidRoles.ADMIN)
  @UseInterceptors(FileInterceptor('qrImage', siteImagesMulterConfig))
  updateSettings(
    @Body() dto: UpdateDonationSettingsDto,
    @UploadedFile() qrImage?: Express.Multer.File,
  ) {
    return this.settings.update(dto, qrImage);
  }
}
