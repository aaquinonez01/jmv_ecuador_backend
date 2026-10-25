import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { CreateLibraryCollectionDto } from './dto/create-library-collection.dto';
import { UpdateLibraryCollectionDto } from './dto/update-library-collection.dto';
import { LibraryCollectionsService } from './library-collections.service';
import { publicApiBase } from './library.mapper';
import { coverMulterConfig } from './storage/library-storage';

@Controller('library/collections')
export class LibraryCollectionsController {
  constructor(private readonly service: LibraryCollectionsService) {}

  @Get('public')
  findPublic(@Req() req: Request) {
    return this.service.findPublic(publicApiBase(req));
  }

  @Get('public/:slug')
  findPublicBySlug(@Param('slug') slug: string, @Req() req: Request) {
    return this.service.findPublicBySlug(slug, publicApiBase(req));
  }

  @Get()
  @Auth(ValidRoles.ADMIN)
  findAll(@Req() req: Request) {
    return this.service.findAll(publicApiBase(req));
  }

  @Get(':id')
  @Auth(ValidRoles.ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.findOne(id, publicApiBase(req));
  }

  @Post()
  @Auth(ValidRoles.ADMIN)
  @UseInterceptors(FileInterceptor('cover', coverMulterConfig))
  create(
    @Body() dto: CreateLibraryCollectionDto,
    @UploadedFile() cover: Express.Multer.File | undefined,
    @Req() req: Request,
  ) {
    return this.service.create(dto, cover, publicApiBase(req));
  }

  @Patch(':id')
  @Auth(ValidRoles.ADMIN)
  @UseInterceptors(FileInterceptor('cover', coverMulterConfig))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLibraryCollectionDto,
    @UploadedFile() cover: Express.Multer.File | undefined,
    @Req() req: Request,
  ) {
    return this.service.update(id, dto, cover, publicApiBase(req));
  }

  @Delete(':id')
  @Auth(ValidRoles.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
