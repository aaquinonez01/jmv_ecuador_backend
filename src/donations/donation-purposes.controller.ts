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
import { DonationPurposesService } from './donation-purposes.service';
import { CreateDonationPurposeDto } from './dto/create-donation-purpose.dto';
import { UpdateDonationPurposeDto } from './dto/update-donation-purpose.dto';

@Controller('donations/purposes')
@Auth(ValidRoles.ADMIN)
export class DonationPurposesController {
  constructor(private readonly service: DonationPurposesService) {}

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
    @Body() dto: CreateDonationPurposeDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.service.create(dto, image);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', siteImagesMulterConfig))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDonationPurposeDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.service.update(id, dto, image);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
