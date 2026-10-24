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
import { CalendarDatesService } from './calendar-dates.service';
import { CreateCalendarDateDto } from './dto/create-calendar-date.dto';
import { UpdateCalendarDateDto } from './dto/update-calendar-date.dto';

@Controller('calendar-dates')
export class CalendarDatesController {
  constructor(private readonly service: CalendarDatesService) {}

  @Get('public')
  findPublic() {
    return this.service.findPublic();
  }

  @Get('public/:slug')
  findPublicBySlug(@Param('slug') slug: string) {
    return this.service.findPublicBySlug(slug);
  }

  @Get()
  @Auth(ValidRoles.ADMIN)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Auth(ValidRoles.ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Auth(ValidRoles.ADMIN)
  @UseInterceptors(FileInterceptor('image', siteImagesMulterConfig))
  create(
    @Body() dto: CreateCalendarDateDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.service.create(dto, image);
  }

  @Patch(':id')
  @Auth(ValidRoles.ADMIN)
  @UseInterceptors(FileInterceptor('image', siteImagesMulterConfig))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCalendarDateDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.service.update(id, dto, image);
  }

  @Delete(':id')
  @Auth(ValidRoles.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
