import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  deleteImageByPublicId,
  uploadImageWithPublicId,
} from 'src/helpers/file-upload.helper';
import { RevalidationService } from '../common/revalidation/revalidation.service';
import { CreateLibraryCollectionDto } from './dto/create-library-collection.dto';
import { UpdateLibraryCollectionDto } from './dto/update-library-collection.dto';
import { LibraryCollection } from './entities/library-collection.entity';
import { LibraryCollectionItem } from './entities/library-collection-item.entity';
import { LibraryDocument } from './entities/library-document.entity';
import {
  LIBRARY_COVER_FOLDER,
  LIBRARY_TAGS,
} from './library-documents.service';
import { slugify, toAdminDocument, toPublicDocument } from './library.mapper';

@Injectable()
export class LibraryCollectionsService {
  private readonly logger = new Logger('LibraryCollectionsService');

  constructor(
    @InjectRepository(LibraryCollection)
    private readonly repository: Repository<LibraryCollection>,
    @InjectRepository(LibraryDocument)
    private readonly documentsRepository: Repository<LibraryDocument>,
    private readonly dataSource: DataSource,
    private readonly revalidation: RevalidationService,
  ) {}

  private map(item: LibraryCollection, base: string, publicOnly: boolean) {
    const documents = [...(item.items ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((entry) => entry.document)
      .filter((doc): doc is LibraryDocument =>
        Boolean(doc && (!publicOnly || doc.published)),
      )
      .map((doc) =>
        publicOnly ? toPublicDocument(doc, base) : toAdminDocument(doc, base),
      );
    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      description: item.description ?? null,
      coverUrl: item.coverUrl ?? null,
      published: item.published,
      displayOrder: item.displayOrder,
      documents,
      ...(publicOnly ? {} : { documentIds: documents.map((doc) => doc.id) }),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private query() {
    return this.repository
      .createQueryBuilder('collection')
      .leftJoinAndSelect('collection.items', 'entry')
      .leftJoinAndSelect('entry.document', 'document')
      .orderBy('collection.displayOrder', 'ASC')
      .addOrderBy('collection.createdAt', 'DESC')
      .addOrderBy('entry.position', 'ASC');
  }

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
      throw new ConflictException(`Ya existe una ruta con el slug "${slug}"`);
    }
  }

  private async assertDocumentsExist(ids: string[]) {
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Un documento está repetido en la ruta');
    }
    if (ids.length === 0) return;
    const found = await this.documentsRepository.count({
      where: { id: In(ids) },
    });
    if (found !== ids.length) {
      throw new BadRequestException('Algún documento de la ruta no existe');
    }
  }

  private revalidate(...slugs: string[]) {
    const paths = ['/biblioteca'];
    for (const slug of new Set(slugs)) paths.push(`/biblioteca/rutas/${slug}`);
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

  // Guarda la ruta y reemplaza sus lecturas en una sola transacción
  private async saveWithItems(
    collection: LibraryCollection,
    documentIds: string[] | undefined,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(LibraryCollection, collection);
      if (documentIds) {
        await manager.delete(LibraryCollectionItem, { collectionId: saved.id });
        if (documentIds.length > 0) {
          await manager.insert(
            LibraryCollectionItem,
            documentIds.map((documentId, position) => ({
              collectionId: saved.id,
              documentId,
              position,
            })),
          );
        }
      }
      return saved;
    });
  }

  private async loadMapped(id: string, base: string) {
    const item = await this.query()
      .where('collection.id = :id', { id })
      .getOne();
    if (!item) throw new NotFoundException('Ruta no encontrada');
    return this.map(item, base, false);
  }

  async create(
    dto: CreateLibraryCollectionDto,
    cover: Express.Multer.File | undefined,
    base: string,
  ) {
    let uploadedId: string | null = null;
    try {
      const documentIds = dto.documentIds ?? [];
      await this.assertDocumentsExist(documentIds);

      let slug: string;
      if (dto.slug) {
        await this.assertSlugAvailable(dto.slug);
        slug = dto.slug;
      } else {
        slug = await this.uniqueSlug(slugify(dto.title, 'ruta'));
      }

      const uploaded = cover
        ? await uploadImageWithPublicId(cover, LIBRARY_COVER_FOLDER)
        : null;
      uploadedId = uploaded?.publicId ?? null;

      const collection = this.repository.create({
        slug,
        title: dto.title,
        description: dto.description ?? null,
        coverUrl: uploaded?.url ?? dto.coverUrl ?? null,
        coverPublicId: uploaded?.publicId ?? null,
        published: dto.published ?? true,
        displayOrder: dto.displayOrder ?? 0,
      });
      const saved = await this.saveWithItems(collection, documentIds);
      this.revalidate(saved.slug);
      return this.loadMapped(saved.id, base);
    } catch (error) {
      if (uploadedId) await this.removeCloudinaryImage(uploadedId);
      this.handleExceptions(error);
    }
  }

  async findAll(base: string) {
    try {
      const items = await this.query().getMany();
      return { items: items.map((item) => this.map(item, base, false)) };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findOne(id: string, base: string) {
    return this.loadMapped(id, base);
  }

  async findPublic(base: string) {
    try {
      const items = await this.query()
        .where('collection.published = true')
        .getMany();
      return { items: items.map((item) => this.map(item, base, true)) };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findPublicBySlug(slug: string, base: string) {
    const item = await this.query()
      .where('collection.slug = :slug', { slug })
      .andWhere('collection.published = true')
      .getOne();
    if (!item) throw new NotFoundException('Ruta no encontrada');
    return this.map(item, base, true);
  }

  async update(
    id: string,
    dto: UpdateLibraryCollectionDto,
    cover: Express.Multer.File | undefined,
    base: string,
  ) {
    let uploadedId: string | null = null;
    try {
      const item = await this.repository.findOne({ where: { id } });
      if (!item) throw new NotFoundException('Ruta no encontrada');
      if (dto.documentIds) await this.assertDocumentsExist(dto.documentIds);

      const previousSlug = item.slug;
      if (dto.slug && dto.slug !== item.slug) {
        await this.assertSlugAvailable(dto.slug, item.id);
        item.slug = dto.slug;
      }
      if (dto.title) item.title = dto.title;
      if (dto.description !== undefined) item.description = dto.description;
      if (dto.published !== undefined) item.published = dto.published;
      if (dto.displayOrder !== undefined && dto.displayOrder !== null) {
        item.displayOrder = dto.displayOrder;
      }

      let staleCoverId: string | null = null;
      if (cover) {
        const uploaded = await uploadImageWithPublicId(
          cover,
          LIBRARY_COVER_FOLDER,
        );
        uploadedId = uploaded.publicId;
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

      const saved = await this.saveWithItems(item, dto.documentIds);
      if (staleCoverId) await this.removeCloudinaryImage(staleCoverId);
      this.revalidate(previousSlug, saved.slug);
      return this.loadMapped(saved.id, base);
    } catch (error) {
      if (uploadedId) await this.removeCloudinaryImage(uploadedId);
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const item = await this.repository.findOne({ where: { id } });
      if (!item) throw new NotFoundException('Ruta no encontrada');
      const { slug, coverPublicId } = item;
      await this.repository.remove(item);
      await this.removeCloudinaryImage(coverPublicId);
      this.revalidate(slug);
      return { message: 'Ruta eliminada correctamente' };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: unknown): never {
    if (error instanceof HttpException) throw error;
    if ((error as { code?: string })?.code === '23505') {
      throw new ConflictException('Ya existe una ruta con ese slug');
    }
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Error al gestionar las rutas de formación',
    );
  }
}
