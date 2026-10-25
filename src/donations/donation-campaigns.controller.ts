import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { siteImagesMulterConfig } from 'src/site_images/config/multer.config';
import { DonationCampaignsService } from './donation-campaigns.service';
import { CreateDonationCampaignDto } from './dto/create-donation-campaign.dto';
import { UpdateDonationCampaignDto } from './dto/update-donation-campaign.dto';

@Controller('donations/campaigns')
@Auth(ValidRoles.ADMIN)
export class DonationCampaignsController {
  constructor(private readonly service: DonationCampaignsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('image', siteImagesMulterConfig))
  create(
    @Body() dto: CreateDonationCampaignDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.service.create(dto, image);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', siteImagesMulterConfig))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDonationCampaignDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.service.update(id, dto, image);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
