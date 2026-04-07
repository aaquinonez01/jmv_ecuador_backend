import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { FilterActivitiesDto } from './dto/filter-activities.dto';
import { activityFilesMulterConfig } from './config/activity-files.config';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  @Get()
  @Auth(ValidRoles.ADMIN)
  findAll(@Query() filterDto: FilterActivitiesDto) {
    return this.service.findAll(filterDto);
  }

  @Get('public')
  findPublic(@Query() filterDto: FilterActivitiesDto) {
    return this.service.findPublic(filterDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Auth(ValidRoles.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'coverImage', maxCount: 1 },
        { name: 'gallery', maxCount: 40 },
      ],
      activityFilesMulterConfig,
    ),
  )
  create(
    @Body() dto: CreateActivityDto,
    @UploadedFiles()
    files: {
      coverImage?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    },
  ) {
    return this.service.create(dto, files);
  }

  @Patch(':id')
  @Auth(ValidRoles.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'coverImage', maxCount: 1 },
        { name: 'gallery', maxCount: 40 },
      ],
      activityFilesMulterConfig,
    ),
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
    @UploadedFiles()
    files: {
      coverImage?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    },
  ) {
    return this.service.update(id, dto, files);
  }

  @Delete(':id')
  @Auth(ValidRoles.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
