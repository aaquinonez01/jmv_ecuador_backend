import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { activityFilesMulterConfig } from 'src/activities/config/activity-files.config';
import { HomeAnnouncementsService } from './home-announcements.service';
import { CreateHomeAnnouncementDto } from './dto/create-home-announcement.dto';
import { UpdateHomeAnnouncementDto } from './dto/update-home-announcement.dto';

@Controller('home-announcements')
export class HomeAnnouncementsController {
  constructor(private readonly service: HomeAnnouncementsService) {}

  @Get('active')
  findActive() {
    return this.service.findActive();
  }

  @Get()
  @Auth(ValidRoles.ADMIN)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Auth(ValidRoles.ADMIN)
  @UseInterceptors(FileInterceptor('image', activityFilesMulterConfig))
  create(
    @Body() dto: CreateHomeAnnouncementDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.service.create(dto, image);
  }

  @Patch(':id')
  @Auth(ValidRoles.ADMIN)
  @UseInterceptors(FileInterceptor('image', activityFilesMulterConfig))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHomeAnnouncementDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.service.update(id, dto, image);
  }

  @Delete(':id')
  @Auth(ValidRoles.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
