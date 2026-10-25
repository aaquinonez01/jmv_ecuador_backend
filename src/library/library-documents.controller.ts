import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { RealIpThrottlerGuard } from 'src/common/guards/real-ip-throttler.guard';
import { CreateLibraryDocumentDto } from './dto/create-library-document.dto';
import { UpdateLibraryDocumentDto } from './dto/update-library-document.dto';
import {
  LibraryDocumentsService,
  type LibraryUploads,
} from './library-documents.service';
import { publicApiBase } from './library.mapper';
import { CleanupUploadedPdfInterceptor } from './storage/cleanup-upload.interceptor';
import { libraryMulterConfig } from './storage/library-storage';

const UPLOAD_FIELDS = FileFieldsInterceptor(
  [
    { name: 'file', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ],
  libraryMulterConfig,
);

@Controller('library/documents')
export class LibraryDocumentsController {
  constructor(private readonly service: LibraryDocumentsService) {}

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

  @Get(':id/link')
  async link(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.resolveLink(id, authorization);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Vary', 'Authorization');
    return result;
  }

  // PDF con soporte de Range (pdf.js lo pide por partes). Los documentos para
  // miembros exigen "Authorization: Bearer <token>".
  @Get(':id/file')
  async file(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('download') download: string | undefined,
    @Query('v') version: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Headers('range') range: string | undefined,
    @Res() res: Response,
  ) {
    const asAttachment = download === '1' || download === 'true';
    const { path, fileName, isPrivate } = await this.service.resolveFile(
      id,
      authorization,
      { download: asAttachment, range },
    );

    await new Promise<void>((resolve, reject) => {
      res.sendFile(
        path,
        {
          acceptRanges: true,
          cacheControl: false,
          etag: true,
          lastModified: true,
          dotfiles: 'deny',
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `${asAttachment ? 'attachment' : 'inline'}; filename="${fileName}"`,
            // Con ?v= (la URL cambia al editar el documento) Cloudflare puede
            // guardarlo un día; sin versión o al descargar (cuenta la descarga)
            // siempre revalida con el ETag (304).
            'Cache-Control': isPrivate
              ? 'private, no-store'
              : version && !asAttachment
                ? 'public, max-age=3600, s-maxage=86400'
                : 'public, no-cache',
            ...(isPrivate ? { Vary: 'Authorization' } : {}),
          },
        },
        (error?: Error & { status?: number }) => {
          if (!error) return resolve();
          if (res.headersSent) return resolve();
          // 416 (rango imposible) y similares los decide "send"
          if (error.status && error.status !== 404) {
            return reject(new HttpException(error.message, error.status));
          }
          reject(new NotFoundException('No encontramos el archivo'));
        },
      );
    });
  }

  @Post(':id/view')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RealIpThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async view(@Param('id') id: string) {
    await this.service.registerView(id);
  }

  @Post()
  @Auth(ValidRoles.ADMIN)
  @UseInterceptors(UPLOAD_FIELDS, CleanupUploadedPdfInterceptor)
  create(
    @Body() dto: CreateLibraryDocumentDto,
    @UploadedFiles() files: LibraryUploads | undefined,
    @Req() req: Request,
  ) {
    return this.service.create(dto, files, publicApiBase(req));
  }

  @Patch(':id')
  @Auth(ValidRoles.ADMIN)
  @UseInterceptors(UPLOAD_FIELDS, CleanupUploadedPdfInterceptor)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLibraryDocumentDto,
    @UploadedFiles() files: LibraryUploads | undefined,
    @Req() req: Request,
  ) {
    return this.service.update(id, dto, files, publicApiBase(req));
  }

  @Delete(':id')
  @Auth(ValidRoles.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
