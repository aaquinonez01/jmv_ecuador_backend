import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { DonationAccountsController } from './donation-accounts.controller';
import { DonationAccountsService } from './donation-accounts.service';
import { DonationCampaignsController } from './donation-campaigns.controller';
import { DonationCampaignsService } from './donation-campaigns.service';
import { DonationPurposesController } from './donation-purposes.controller';
import { DonationPurposesService } from './donation-purposes.service';
import { DonationSettingsService } from './donation-settings.service';
import { DonationsController } from './donations.controller';
import { DonationAccount } from './entities/donation-account.entity';
import { DonationCampaign } from './entities/donation-campaign.entity';
import { DonationPurpose } from './entities/donation-purpose.entity';
import { DonationSettings } from './entities/donation-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DonationSettings,
      DonationAccount,
      DonationPurpose,
      DonationCampaign,
    ]),
    CommonModule,
  ],
  controllers: [
    DonationsController,
    DonationAccountsController,
    DonationPurposesController,
    DonationCampaignsController,
  ],
  providers: [
    DonationSettingsService,
    DonationAccountsService,
    DonationPurposesService,
    DonationCampaignsService,
  ],
})
export class DonationsModule {}
