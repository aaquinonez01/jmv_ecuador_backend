import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RevalidationService } from '../common/revalidation/revalidation.service';
import { Repository } from 'typeorm';
import { SiteImage } from './entities/site-image.entity';
import { CreateSiteImageDto } from './dto/create-site-image.dto';
import { UpdateSiteImageDto } from './dto/update-site-image.dto';
import { ReorderSiteImagesDto } from './dto/reorder-site-images.dto';
import {
  deleteImageByPublicId,
  uploadImageWithPublicId,
} from 'src/helpers/file-upload.helper';
import { pathsForSection, publicIdFromUrl } from './site_images.paths';

const SITE_IMAGE_TAGS = ['site_images', 'galeria_actividades'];

// Tope de seguridad por espacio. El máximo real de cada espacio (1, 3, 5…) lo
// define el registro de la web (SITE_IMAGE_SLOTS) y lo aplica el panel.
const MAX_PER_SECTION = 24;

export interface PublicSiteImage {
  id: string;
  url: string;
  alt: string;
  orden: number;
}

@Injectable()
export class SiteImagesService {
  constructor(
    @InjectRepository(SiteImage)
    private readonly repo: Repository<SiteImage>,
    private readonly revalidation: RevalidationService,
  ) {}

  private readonly logger = new Logger('SiteImagesService');

  private queryFor(section: string, subsection?: string | null) {
    const qb = this.repo
      .createQueryBuilder('img')
      .where('img.section = :section', { section });
    if (subsection) {
      qb.andWhere('img.subsection = :subsection', { subsection });
    } else {
      qb.andWhere('img.subsection IS NULL');
    }
    return qb;
  }

  /** Admin: todas las fotos del espacio (también las ocultas), en orden */
  async find(section: string, subsection?: string) {
    return this.queryFor(section, subsection)
      .orderBy('img.orden', 'ASC')
      .addOrderBy('img.createdAt', 'ASC')
      .getMany();
  }

  /** Admin: todas las fotos de todos los espacios, agrupables por section */
  async findAll() {
    return this.repo
      .createQueryBuilder('img')
      .orderBy('img.section', 'ASC')
      .addOrderBy('img.subsection', 'ASC', 'NULLS FIRST')
      .addOrderBy('img.orden', 'ASC')
      .addOrderBy('img.createdAt', 'ASC')
      .getMany();
  }

  /** Público: solo fotos activas y solo los campos que la web necesita */
  async findPublic(
    section: string,
    subsection?: string,
  ): Promise<{ items: PublicSiteImage[] }> {
    const rows = await this.queryFor(section, subsection)
      .andWhere('img.activo = true')
      .select(['img.id', 'img.url', 'img.alt', 'img.orden', 'img.createdAt'])
      .orderBy('img.orden', 'ASC')
      .addOrderBy('img.createdAt', 'ASC')
      .getMany();
    return {
      items: rows.map(({ id, url, alt, orden }) => ({ id, url, alt, orden })),
    };
  }

  private folderFor(section: string, subsection?: string | null) {
    const base = `jmv_ecuador/site/${section}`;
    return subsection ? `${base}/${subsection}` : base;
  }

  private revalidateFor(section: string) {
    void this.revalidation.revalidate(
      SITE_IMAGE_TAGS,
      pathsForSection(section),
    );
  }

  private rethrow(error: unknown, message: string): never {
    if (error instanceof HttpException) throw error;
    this.logger.error(error);
    throw new InternalServerErrorException(message);
  }

  async create(
    dto: CreateSiteImageDto,
    file: Express.Multer.File,
    uploadedBy?: string,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('Elige una imagen para subir');
      }
      const count = await this.queryFor(dto.section, dto.subsection).getCount();
      if (count >= MAX_PER_SECTION) {
        throw new BadRequestException(
          `Este espacio ya tiene ${count} fotos. Elimina alguna antes de subir otra.`,
        );
      }
      const { url, publicId } = await uploadImageWithPublicId(
        file,
        this.folderFor(dto.section, dto.subsection),
      );
      const last = await this.queryFor(dto.section, dto.subsection)
        .select('MAX(img.orden)', 'max')
        .getRawOne<{ max: number | string | null }>();
      const image = this.repo.create({
        section: dto.section,
        subsection: dto.subsection ?? null,
        url,
        publicId,
        filename: file.originalname,
        alt: dto.alt,
        title: dto.title ?? null,
        description: dto.description ?? null,
        activo: dto.activo ?? true,
        orden: (Number(last?.max) || 0) + 1,
        metadata: {
          size: file.size,
          format: file.mimetype.split('/')[1],
          uploadedAt: new Date().toISOString(),
          uploadedBy,
          groupId: dto.groupId,
        },
        eventData: dto.eventData ?? null,
        personData: dto.personData ?? null,
      });
      const saved = await this.repo.save(image);
      this.revalidateFor(saved.section);
      return saved;
    } catch (error) {
      this.rethrow(error, 'No se pudo subir la imagen');
    }
  }

  async update(id: string, dto: UpdateSiteImageDto) {
    try {
      const img = await this.repo.findOne({ where: { id } });
      if (!img) {
        throw new NotFoundException('Imagen no encontrada');
      }
      const updated = this.repo.merge(img, {
        alt: dto.alt ?? img.alt,
        title: dto.title ?? img.title,
        description: dto.description ?? img.description,
        activo: dto.activo ?? img.activo,
        orden: dto.orden ?? img.orden,
        eventData: dto.eventData ?? img.eventData,
        personData: dto.personData ?? img.personData,
      });
      const saved = await this.repo.save(updated);
      this.revalidateFor(saved.section);
      return saved;
    } catch (error) {
      this.rethrow(error, 'No se pudo actualizar la imagen');
    }
  }

  async remove(id: string) {
    try {
      const img = await this.repo.findOne({ where: { id } });
      if (!img) {
        throw new NotFoundException('Imagen no encontrada');
      }
      const { section } = img;
      const publicId = img.publicId ?? publicIdFromUrl(img.url);
      await this.repo.remove(img);
      // Si Cloudinary falla, la foto ya no se muestra: solo queda el archivo huérfano.
      try {
        await deleteImageByPublicId(publicId);
      } catch (error) {
        this.logger.warn(
          `No se pudo borrar ${publicId} de Cloudinary: ${(error as Error).message}`,
        );
      }
      this.revalidateFor(section);
      return { message: 'Imagen eliminada' };
    } catch (error) {
      this.rethrow(error, 'No se pudo eliminar la imagen');
    }
  }

  async reorder(dto: ReorderSiteImagesDto) {
    try {
      const images = await this.find(dto.section, dto.subsection);
      const byId = new Map(images.map((i) => [i.id, i]));
      if (dto.ids.some((id) => !byId.has(id))) {
        throw new BadRequestException(
          'Alguna foto no pertenece a este espacio. Recarga la página.',
        );
      }
      // Las que no vengan en la lista quedan al final, en su orden actual
      const listed = new Set(dto.ids);
      const ordered = [
        ...dto.ids.map((id) => byId.get(id) as SiteImage),
        ...images.filter((i) => !listed.has(i.id)),
      ];
      const changed = ordered.filter((item, idx) => {
        if (item.orden === idx + 1) return false;
        item.orden = idx + 1;
        return true;
      });
      if (changed.length) await this.repo.save(changed);
      this.revalidateFor(dto.section);
      return { message: 'Orden actualizado' };
    } catch (error) {
      this.rethrow(error, 'No se pudo reordenar las imágenes');
    }
  }
}
