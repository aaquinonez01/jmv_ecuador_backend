import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { activityFilesMulterConfig } from 'src/activities/config/activity-files.config';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { FilterTestimonialsDto } from './dto/filter-testimonials.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { TestimonialsService } from './testimonials.service';

@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly service: TestimonialsService) {}

  @Get()
  @Auth(ValidRoles.ADMIN)
  findAll(@Query() filterDto: FilterTestimonialsDto) {
    return this.service.findAll(filterDto);
  }

  @Get('public')
  findPublic(@Query() filterDto: FilterTestimonialsDto) {
    return this.service.findPublic(filterDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Auth(ValidRoles.ADMIN)
  @UseInterceptors(FileInterceptor('image', activityFilesMulterConfig))
  create(
    @Body() dto: CreateTestimonialDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.service.create(dto, image);
  }

  @Patch(':id')
  @Auth(ValidRoles.ADMIN)
  @UseInterceptors(FileInterceptor('image', activityFilesMulterConfig))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTestimonialDto,
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
