import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
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
import { FindSiteImagesDto } from './dto/find-site-images.dto';
import { siteImagesMulterConfig } from './config/multer.config';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user';

@Controller('site-images')
export class SiteImagesController {
  constructor(private readonly service: SiteImagesService) {}

  /**
   * Público: fotos activas de un espacio de la web, en orden.
   * GET /site-images/public?section=home.hero -> { items: [{ id, url, alt, orden }] }
   */
  @Get('public')
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  findPublic(@Query() query: FindSiteImagesDto) {
    return this.service.findPublic(query.section, query.subsection);
  }

  /** Admin: todas las fotos de todos los espacios, para el panel (una sola petición) */
  @Get('all')
  @Auth(ValidRoles.ADMIN)
  findAll() {
    return this.service.findAll();
  }

  /** Admin: todas las fotos del espacio (incluye ocultas y metadatos) */
  @Get()
  @Auth(ValidRoles.ADMIN)
  find(@Query() query: FindSiteImagesDto) {
    return this.service.find(query.section, query.subsection);
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

  // Debe ir antes de ':id' o Express lo captura como id="reorder"
  @Patch('reorder')
  @Auth(ValidRoles.ADMIN)
  reorder(@Body() dto: ReorderSiteImagesDto) {
    return this.service.reorder(dto);
  }

  @Patch(':id')
  @Auth(ValidRoles.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSiteImageDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Auth(ValidRoles.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
