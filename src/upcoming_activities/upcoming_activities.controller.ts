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
import { UpcomingActivitiesService } from './upcoming_activities.service';
import { CreateUpcomingActivityDto } from './dto/create-upcoming-activity.dto';
import { UpdateUpcomingActivityDto } from './dto/update-upcoming-activity.dto';
import { FilterUpcomingActivitiesDto } from './dto/filter-upcoming-activities.dto';
import { activityFilesMulterConfig } from 'src/activities/config/activity-files.config';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';

@Controller('upcoming-activities')
export class UpcomingActivitiesController {
  constructor(private readonly service: UpcomingActivitiesService) {}

  @Get()
  @Auth(ValidRoles.ADMIN)
  findAll(@Query() filterDto: FilterUpcomingActivitiesDto) {
    return this.service.findAll(filterDto);
  }

  @Get('public')
  findPublic(@Query() filterDto: FilterUpcomingActivitiesDto) {
    return this.service.findPublic(filterDto);
  }

  @Get('home')
  findHome() {
    return this.service.findHome();
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
        { name: 'documents', maxCount: 10 },
      ],
      activityFilesMulterConfig,
    ),
  )
  create(
    @Body() dto: CreateUpcomingActivityDto,
    @UploadedFiles()
    files: {
      coverImage?: Express.Multer.File[];
      documents?: Express.Multer.File[];
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
        { name: 'documents', maxCount: 10 },
      ],
      activityFilesMulterConfig,
    ),
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUpcomingActivityDto,
    @UploadedFiles()
    files: {
      coverImage?: Express.Multer.File[];
      documents?: Express.Multer.File[];
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
