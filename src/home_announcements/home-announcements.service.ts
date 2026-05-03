import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { uploadSingleImage } from 'src/helpers/file-upload.helper';
import {
  HomeAnnouncement,
  TipoAnnouncement,
} from './entities/home-announcement.entity';
import { CreateHomeAnnouncementDto } from './dto/create-home-announcement.dto';
import { UpdateHomeAnnouncementDto } from './dto/update-home-announcement.dto';

@Injectable()
export class HomeAnnouncementsService {
  private readonly logger = new Logger('HomeAnnouncementsService');

  constructor(
    @InjectRepository(HomeAnnouncement)
    private readonly repository: Repository<HomeAnnouncement>,
  ) {}

  private normalizeBoolean(value?: string | boolean, defaultValue = false) {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;
    return ['true', '1', 'on'].includes(value.toLowerCase());
  }

  private normalizeNumber(value?: string | number | null, defaultValue = 0) {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'number') return value;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }

  private mapAnnouncement(item: HomeAnnouncement) {
    return {
      id: item.id,
      titulo: item.titulo,
      subtitulo: item.subtitulo,
      mensaje: item.mensaje,
      tipo: item.tipo,
      imageUrl: item.imageUrl,
      ctaLabel: item.ctaLabel,
      ctaUrl: item.ctaUrl,
      fechaPublicacion: item.fechaPublicacion,
      fechaExpiracion: item.fechaExpiracion,
      displayOrder: item.displayOrder,
      featuredInHome: item.featuredInHome,
      active: item.active,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async create(
    dto: CreateHomeAnnouncementDto,
    image?: Express.Multer.File,
  ) {
    try {
      const imageUrl = image
        ? await uploadSingleImage(image, 'jmv_ecuador/home_announcements')
        : null;

      const count = await this.repository.count();

      const announcement = this.repository.create({
        titulo: dto.titulo,
        subtitulo: dto.subtitulo,
        mensaje: dto.mensaje,
        tipo: dto.tipo ?? TipoAnnouncement.GENERAL,
        ctaLabel: dto.ctaLabel,
        ctaUrl: dto.ctaUrl,
        fechaPublicacion: dto.fechaPublicacion
          ? new Date(dto.fechaPublicacion)
          : new Date(),
        fechaExpiracion: dto.fechaExpiracion
          ? new Date(dto.fechaExpiracion)
          : undefined,
        imageUrl: imageUrl ?? undefined,
        displayOrder: this.normalizeNumber(dto.displayOrder, count + 1),
        featuredInHome: this.normalizeBoolean(dto.featuredInHome, true),
        active: this.normalizeBoolean(dto.active, true),
      });

      const saved = await this.repository.save(announcement);
      return this.mapAnnouncement(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll() {
    const items = await this.repository.find({
      order: { displayOrder: 'ASC', fechaPublicacion: 'DESC' },
    });
    return items.map((i) => this.mapAnnouncement(i));
  }

  async findActive() {
    const now = new Date();
    const items = await this.repository
      .createQueryBuilder('a')
      .where('a.active = :active', { active: true })
      .andWhere('a.featuredInHome = :featured', { featured: true })
      .andWhere('a.fechaPublicacion <= :now', { now })
      .andWhere(
        new Brackets((qb) => {
          qb.where('a.fechaExpiracion IS NULL').orWhere(
            'a.fechaExpiracion > :now',
            { now },
          );
        }),
      )
      .orderBy('a.displayOrder', 'ASC')
      .addOrderBy('a.fechaPublicacion', 'DESC')
      .getMany();

    return items.map((i) => this.mapAnnouncement(i));
  }

  async findOne(id: string) {
    const item = await this.repository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Anuncio no encontrado');
    }
    return this.mapAnnouncement(item);
  }

  async update(
    id: string,
    dto: UpdateHomeAnnouncementDto,
    image?: Express.Multer.File,
  ) {
    try {
      const item = await this.repository.findOne({ where: { id } });
      if (!item) {
        throw new NotFoundException('Anuncio no encontrado');
      }

      if (image) {
        item.imageUrl =
          (await uploadSingleImage(
            image,
            'jmv_ecuador/home_announcements',
          )) ?? item.imageUrl;
      }

      item.titulo = dto.titulo ?? item.titulo;
      item.subtitulo = dto.subtitulo ?? item.subtitulo;
      item.mensaje = dto.mensaje ?? item.mensaje;
      item.tipo = dto.tipo ?? item.tipo;
      item.ctaLabel = dto.ctaLabel ?? item.ctaLabel;
      item.ctaUrl = dto.ctaUrl ?? item.ctaUrl;
      if (dto.fechaPublicacion !== undefined) {
        item.fechaPublicacion = new Date(dto.fechaPublicacion);
      }
      if (dto.fechaExpiracion !== undefined) {
        item.fechaExpiracion = dto.fechaExpiracion
          ? new Date(dto.fechaExpiracion)
          : undefined;
      }
      if (dto.displayOrder !== undefined) {
        item.displayOrder = this.normalizeNumber(
          dto.displayOrder,
          item.displayOrder,
        );
      }
      if (dto.featuredInHome !== undefined) {
        item.featuredInHome = this.normalizeBoolean(
          dto.featuredInHome,
          item.featuredInHome,
        );
      }
      if (dto.active !== undefined) {
        item.active = this.normalizeBoolean(dto.active, item.active);
      }

      const saved = await this.repository.save(item);
      return this.mapAnnouncement(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const item = await this.repository.findOne({ where: { id } });
      if (!item) {
        throw new NotFoundException('Anuncio no encontrado');
      }
      await this.repository.remove(item);
      return { message: 'Anuncio eliminado correctamente' };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: unknown): never {
    this.logger.error(error);
    if (error instanceof NotFoundException) {
      throw error;
    }
    throw new InternalServerErrorException('Error al gestionar anuncios');
  }
}
