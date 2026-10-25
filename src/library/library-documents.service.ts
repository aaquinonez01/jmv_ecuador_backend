import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { stat } from 'fs/promises';
import { Repository } from 'typeorm';
import { User } from 'src/auth/entities/user';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';
import {
  deleteImageByPublicId,
  uploadImageWithPublicId,
} from 'src/helpers/file-upload.helper';
import { RevalidationService } from '../common/revalidation/revalidation.service';
import { CreateLibraryDocumentDto } from './dto/create-library-document.dto';
import { UpdateLibraryDocumentDto } from './dto/update-library-document.dto';
import { LibraryCollectionItem } from './entities/library-collection-item.entity';
import { LibraryDocument } from './entities/library-document.entity';
import {
  originalFileName,
  slugify,
  toAdminDocument,
  toPublicDocument,
} from './library.mapper';
import { removeStoredFile, resolveStoredFile } from './storage/library-storage';

export const LIBRARY_TAGS = ['library'];
export const LIBRARY_COVER_FOLDER = 'jmv_ecuador/library';

export type LibraryUploads = {
  file?: Express.Multer.File[];
  cover?: Express.Multer.File[];
};

const OPTIONAL_FIELDS = [
  'author',
  'description',
  'axis',
  'pageCount',
  'readingMinutes',
] as const;

@Injectable()
export class LibraryDocumentsService {
  private readonly logger = new Logger('LibraryDocumentsService');

  constructor(
    @InjectRepository(LibraryDocument)
    private readonly repository: Repository<LibraryDocument>,
    @InjectRepository(LibraryCollectionItem)
    private readonly itemsRepository: Repository<LibraryCollectionItem>,
    private readonly revalidation: RevalidationService,
    private readonly jwtService: JwtService,
    private readonly jwtStrategy: JwtStrategy,
  ) {}

  private async uniqueSlug(base: string) {
    let candidate = base;
    let suffix = 2;
    while (await this.repository.exists({ where: { slug: candidate } })) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private async assertSlugAvailable(slug: string, exceptId?: string) {
    const existing = await this.repository.findOne({
      where: { slug },
      select: { id: true },
    });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(
        `Ya existe un documento con el slug "${slug}"`,
      );
    }
  }

  // Un PDF publicado necesita su archivo; enlaces y videos, su URL
  private assertContent(item: LibraryDocument) {
    if (item.kind === 'pdf') {
      if (item.published && !item.filePath) {
        throw new BadRequestException(
          'Sube el PDF o guarda el documento como borrador (published=false)',
        );
      }
      return;
    }
    if (!item.externalUrl) {
      throw new BadRequestException(
        'Los enlaces y videos necesitan la URL (externalUrl)',
      );
    }
  }

  private async collectionSlugsOf(documentId: string) {
    const items = await this.itemsRepository.find({
      where: { documentId },
      relations: { collection: true },
    });
    return items
      .map((item) => item.collection?.slug)
      .filter((slug): slug is string => Boolean(slug));
  }

  private async revalidate(documentId: string, ...slugs: string[]) {
    const paths = ['/biblioteca'];
    for (const slug of new Set(slugs)) {
      paths.push(`/biblioteca/${slug}`, `/biblioteca/${slug}/leer`);
    }
    try {
      for (const slug of await this.collectionSlugsOf(documentId)) {
        paths.push(`/biblioteca/rutas/${slug}`);
      }
    } catch {
      // La revalidación por tag ya cubre las rutas
    }
    void this.revalidation.revalidate(LIBRARY_TAGS, paths);
  }

  private async removeCloudinaryImage(publicId?: string | null) {
    try {
      await deleteImageByPublicId(publicId);
    } catch (error) {
      this.logger.warn(
        `No se pudo borrar la portada ${publicId} de Cloudinary: ${(error as Error).message}`,
      );
    }
  }

  private async removeFile(name?: string | null) {
    try {
      await removeStoredFile(name);
    } catch (error) {
      this.logger.warn(
        `No se pudo borrar el archivo ${name}: ${(error as Error).message}`,
      );
    }
  }

  async create(
    dto: CreateLibraryDocumentDto,
    files: LibraryUploads | undefined,
    base: string,
  ) {
    // El PDF recién escrito lo borra CleanupUploadedPdfInterceptor si algo falla
    let uploadedCoverId: string | null = null;
    try {
      const file = files?.file?.[0];
      const cover = files?.cover?.[0];
      const kind = dto.kind ?? (file || !dto.externalUrl ? 'pdf' : 'enlace');
      if (file && kind !== 'pdf') {
        throw new BadRequestException('Solo los documentos PDF llevan archivo');
      }

      let slug: string;
      if (dto.slug) {
        await this.assertSlugAvailable(dto.slug);
        slug = dto.slug;
      } else {
        slug = await this.uniqueSlug(slugify(dto.title, 'documento'));
      }

      const item = this.repository.create({
        slug,
        title: dto.title,
        author: dto.author ?? null,
        summary: dto.summary,
        description: dto.description ?? null,
        kind,
        type: dto.type,
        axis: dto.axis ?? null,
        stage: dto.stage ?? 'todos',
        tags: dto.tags ?? [],
        visibility: dto.visibility ?? 'publico',
        coverUrl: dto.coverUrl ?? null,
        coverPublicId: null,
        externalUrl: dto.externalUrl ?? null,
        filePath: file?.filename ?? null,
        fileName: file ? originalFileName(file) : null,
        fileSize: file?.size ?? null,
        fileMime: file ? 'application/pdf' : null,
        pageCount: dto.pageCount ?? null,
        readingMinutes: dto.readingMinutes ?? null,
        featured: dto.featured ?? false,
        published: dto.published ?? true,
        displayOrder: dto.displayOrder ?? 0,
      });
      this.assertContent(item);

      if (cover) {
        const uploaded = await uploadImageWithPublicId(
          cover,
          LIBRARY_COVER_FOLDER,
        );
        uploadedCoverId = uploaded.publicId;
        item.coverUrl = uploaded.url;
        item.coverPublicId = uploaded.publicId;
      }

      const saved = await this.repository.save(item);
      void this.revalidate(saved.id, saved.slug);
      return toAdminDocument(saved, base);
    } catch (error) {
      if (uploadedCoverId) await this.removeCloudinaryImage(uploadedCoverId);
      this.handleExceptions(error);
    }
  }

  async findAll(base: string) {
    try {
      const items = await this.repository.find({
        order: { featured: 'DESC', displayOrder: 'ASC', createdAt: 'DESC' },
      });
      return { items: items.map((item) => toAdminDocument(item, base)) };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findOne(id: string, base: string) {
    const item = await this.repository.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Documento no encontrado');
    return toAdminDocument(item, base);
  }

  async findPublic(base: string) {
    try {
      const items = await this.repository.find({
        where: { published: true },
        order: { featured: 'DESC', displayOrder: 'ASC', createdAt: 'DESC' },
      });
      return { items: items.map((item) => toPublicDocument(item, base)) };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findPublicBySlug(slug: string, base: string) {
    const item = await this.repository.findOne({
      where: { slug, published: true },
    });
    if (!item) throw new NotFoundException('Documento no encontrado');
    return toPublicDocument(item, base);
  }

  // Siempre 204: así un id inexistente no se distingue de uno válido y
  // el navegador puede enviar la vista sin preocuparse por errores.
  async registerView(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return;
    try {
      await this.repository.increment({ id, published: true }, 'views', 1);
    } catch (error) {
      this.logger.warn(
        `No se pudo contar la vista de ${id}: ${(error as Error).message}`,
      );
    }
  }

  private async userFromAuthorization(header?: string) {
    const match = /^Bearer\s+(\S+)$/i.exec(header ?? '');
    if (!match) return null;
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(match[1]);
      // Mismas reglas que AuthGuard('jwt'): usuario existente, activo y con
      // un token emitido después del último cambio de contraseña
      return await this.jwtStrategy.validate(payload);
    } catch {
      return null;
    }
  }

  // Decide si quien pide puede leer el PDF y devuelve dónde está en disco
  async resolveFile(
    id: string,
    authorization: string | undefined,
    options: { download: boolean; range?: string },
  ) {
    const item = await this.repository.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Documento no encontrado');

    const needsUser = item.visibility === 'miembros' || !item.published;
    const user: User | null = needsUser
      ? await this.userFromAuthorization(authorization)
      : null;
    const isAdmin = user?.role === (ValidRoles.ADMIN as string);

    if (!item.published && !isAdmin) {
      throw new NotFoundException('Documento no encontrado');
    }
    if (item.visibility === 'miembros' && !user) {
      throw new UnauthorizedException('Inicia sesión para leer este documento');
    }

    const path = item.kind === 'pdf' ? resolveStoredFile(item.filePath) : null;
    if (!path) throw new NotFoundException('Este documento no tiene archivo');
    try {
      const info = await stat(path);
      if (!info.isFile()) throw new Error('No es un archivo');
    } catch {
      this.logger.error(`Falta el archivo de ${item.slug} en ${path}`);
      throw new NotFoundException(
        'No encontramos el archivo de este documento',
      );
    }

    // Una descarga cuenta una vez, no por cada trozo pedido con Range
    const firstChunk = !options.range || /^bytes=0-/.test(options.range);
    if (options.download && firstChunk && item.published) {
      void this.repository
        .increment({ id: item.id }, 'downloads', 1)
        .catch(() => undefined);
    }

    return {
      path,
      fileName: `${item.slug}.pdf`,
      isPrivate: item.visibility === 'miembros' || !item.published,
    };
  }

  async update(
    id: string,
    dto: UpdateLibraryDocumentDto,
    files: LibraryUploads | undefined,
    base: string,
  ) {
    let uploadedCoverId: string | null = null;
    try {
      const item = await this.repository.findOne({ where: { id } });
      if (!item) throw new NotFoundException('Documento no encontrado');

      const file = files?.file?.[0];
      const cover = files?.cover?.[0];
      const previousSlug = item.slug;

      if (dto.slug && dto.slug !== item.slug) {
        await this.assertSlugAvailable(dto.slug, item.id);
        item.slug = dto.slug;
      }

      if (dto.kind) item.kind = dto.kind;
      else if (file) item.kind = 'pdf';
      if (file && item.kind !== 'pdf') {
        throw new BadRequestException('Solo los documentos PDF llevan archivo');
      }

      // El archivo anterior se borra solo cuando el cambio ya está guardado
      let staleFile: string | null = null;
      if (file) {
        staleFile = item.filePath ?? null;
        item.filePath = file.filename;
        item.fileName = originalFileName(file);
        item.fileSize = file.size;
        item.fileMime = 'application/pdf';
      } else if (dto.removeFile || (item.kind !== 'pdf' && item.filePath)) {
        staleFile = item.filePath ?? null;
        item.filePath = null;
        item.fileName = null;
        item.fileSize = null;
        item.fileMime = null;
      }

      if (dto.title) item.title = dto.title;
      if (dto.summary) item.summary = dto.summary;
      if (dto.type) item.type = dto.type;
      if (dto.stage) item.stage = dto.stage;
      if (dto.visibility) item.visibility = dto.visibility;
      if (dto.tags !== undefined) item.tags = dto.tags;
      if (dto.externalUrl !== undefined) item.externalUrl = dto.externalUrl;
      for (const field of OPTIONAL_FIELDS) {
        if (dto[field] !== undefined) {
          (item as unknown as Record<string, unknown>)[field] = dto[field];
        }
      }
      if (dto.featured !== undefined) item.featured = dto.featured;
      if (dto.published !== undefined) item.published = dto.published;
      if (dto.displayOrder !== undefined && dto.displayOrder !== null) {
        item.displayOrder = dto.displayOrder;
      }
      this.assertContent(item);

      let staleCoverId: string | null = null;
      if (cover) {
        const uploaded = await uploadImageWithPublicId(
          cover,
          LIBRARY_COVER_FOLDER,
        );
        uploadedCoverId = uploaded.publicId;
        staleCoverId = item.coverPublicId ?? null;
        item.coverUrl = uploaded.url;
        item.coverPublicId = uploaded.publicId;
      } else if (dto.removeCover) {
        staleCoverId = item.coverPublicId ?? null;
        item.coverUrl = null;
        item.coverPublicId = null;
      } else if (dto.coverUrl !== undefined && dto.coverUrl !== item.coverUrl) {
        staleCoverId = item.coverPublicId ?? null;
        item.coverUrl = dto.coverUrl;
        item.coverPublicId = null;
      }

      const saved = await this.repository.save(item);
      if (staleFile && staleFile !== saved.filePath) {
        await this.removeFile(staleFile);
      }
      if (staleCoverId) await this.removeCloudinaryImage(staleCoverId);
      void this.revalidate(saved.id, previousSlug, saved.slug);
      return toAdminDocument(saved, base);
    } catch (error) {
      if (uploadedCoverId) await this.removeCloudinaryImage(uploadedCoverId);
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const item = await this.repository.findOne({ where: { id } });
      if (!item) throw new NotFoundException('Documento no encontrado');
      const { slug, filePath, coverPublicId } = item;
      const collectionSlugs = await this.collectionSlugsOf(id);
      await this.repository.remove(item);
      await this.removeFile(filePath);
      await this.removeCloudinaryImage(coverPublicId);
      void this.revalidation.revalidate(LIBRARY_TAGS, [
        '/biblioteca',
        `/biblioteca/${slug}`,
        `/biblioteca/${slug}/leer`,
        ...collectionSlugs.map((s) => `/biblioteca/rutas/${s}`),
      ]);
      return { message: 'Documento eliminado correctamente' };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: unknown): never {
    if (error instanceof HttpException) throw error;
    if ((error as { code?: string })?.code === '23505') {
      throw new ConflictException('Ya existe un documento con ese slug');
    }
    this.logger.error(error);
    throw new InternalServerErrorException('Error al gestionar la biblioteca');
  }
}
