import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteImage } from './entities/site-image.entity';
import { CreateSiteImageDto } from './dto/create-site-image.dto';
import { UpdateSiteImageDto } from './dto/update-site-image.dto';
import { ReorderSiteImagesDto } from './dto/reorder-site-images.dto';
import { uploadSingleImage } from 'src/helpers/file-upload.helper';

@Injectable()
export class SiteImagesService {
  constructor(
    @InjectRepository(SiteImage)
    private readonly repo: Repository<SiteImage>,
  ) {}

  private readonly logger = new Logger('SiteImagesService');

  async find(section: string, subsection?: string) {
    const qb = this.repo
      .createQueryBuilder('img')
      .where('img.section = :section', { section })
      .orderBy('img.orden', 'ASC');
    if (subsection) {
      qb.andWhere('img.subsection = :subsection', { subsection });
    }
    return qb.getMany();
  }

  private folderFor(section: string, subsection?: string) {
    const base = `jmv_ecuador/site/${section}`;
    return subsection ? `${base}/${subsection}` : base;
  }

  async create(
    dto: CreateSiteImageDto,
    file: Express.Multer.File,
    uploadedBy?: string,
  ) {
    try {
      if (!file) {
        throw new InternalServerErrorException('Archivo requerido');
      }
      const folder = this.folderFor(dto.section, dto.subsection);
      const url = await uploadSingleImage(file, folder);
      if (!url) {
        throw new InternalServerErrorException('No se pudo subir la imagen');
      }
      const image = this.repo.create({
        section: dto.section,
        subsection: dto.subsection ?? null,
        url,
        filename: file.originalname,
        alt: dto.alt,
        title: dto.title ?? null,
        description: dto.description ?? null,
        activo: dto.activo ?? true,
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
      const countQb = this.repo
        .createQueryBuilder('img')
        .where('img.section = :section', { section: dto.section });
      if (dto.subsection) {
        countQb.andWhere('img.subsection = :subsection', {
          subsection: dto.subsection,
        });
      } else {
        countQb.andWhere('img.subsection IS NULL');
      }
      const count = await countQb.getCount();
      image.orden = count + 1;
      return this.repo.save(image);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Error al crear imagen');
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
        section: dto.section ?? img.section,
        subsection: dto.subsection ?? img.subsection,
        eventData: dto.eventData ?? img.eventData,
        personData: dto.personData ?? img.personData,
      });
      await this.repo.save(updated);
      return updated;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Error al actualizar imagen');
    }
  }

  async remove(id: string) {
    try {
      const img = await this.repo.findOne({ where: { id } });
      if (!img) {
        throw new NotFoundException('Imagen no encontrada');
      }
      await this.repo.remove(img);
      return { message: 'Imagen eliminada' };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Error al eliminar imagen');
    }
  }

  async reorder(dto: ReorderSiteImagesDto) {
    try {
      const images = await this.find(dto.section, dto.subsection);
      const byId = new Map(images.map((i) => [i.id, i]));
      dto.ids.forEach((id, idx) => {
        const item = byId.get(id);
        if (item) item.orden = idx + 1;
      });
      await this.repo.save([...byId.values()]);
      return { message: 'Orden actualizado' };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Error al reordenar imágenes');
    }
  }
}
