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
import { SiteImagesService } from './site_images.service';
import { CreateSiteImageDto } from './dto/create-site-image.dto';
import { UpdateSiteImageDto } from './dto/update-site-image.dto';
import { ReorderSiteImagesDto } from './dto/reorder-site-images.dto';
import { siteImagesMulterConfig } from './config/multer.config';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user';

@Controller('site-images')
export class SiteImagesController {
  constructor(private readonly service: SiteImagesService) {}

  @Get()
  find(@Query('section') section: string, @Query('subsection') subsection?: string) {
    return this.service.find(section, subsection);
  }

  @Post()
  @Auth(ValidRoles.ADMIN)
  @UseInterceptors(FileInterceptor('file', siteImagesMulterConfig))
  create(
    @Body() dto: CreateSiteImageDto,
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: User,
  ) {
    return this.service.create(dto, file, user?.fullName);
  }

  @Patch(':id')
  @Auth(ValidRoles.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateSiteImageDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Auth(ValidRoles.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Patch('reorder')
  @Auth(ValidRoles.ADMIN)
  reorder(@Body() dto: ReorderSiteImagesDto) {
    return this.service.reorder(dto);
  }
}

