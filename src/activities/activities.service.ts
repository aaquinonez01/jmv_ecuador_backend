import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { ActivityImage } from './entities/activity-image.entity';
import { ActivityPillar } from 'src/activity_pillars/entities/activity-pillar.entity';
import { ActivityTypeCatalog } from 'src/activity_types/entities/activity-type.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { FilterActivitiesDto } from './dto/filter-activities.dto';
import {
  uploadImagesToFolder,
  uploadSingleImage,
} from 'src/helpers/file-upload.helper';
import { RevalidationService } from '../common/revalidation/revalidation.service';

const ACTIVITY_TAGS = ['activities_public', 'activities_public_home'];

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger('ActivitiesService');

  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(ActivityImage)
    private readonly activityImageRepository: Repository<ActivityImage>,
    private readonly revalidation: RevalidationService,
  ) {}

  private normalizeBoolean(value?: string | boolean, defaultValue = false) {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;
    return ['true', '1', 'on'].includes(value.toLowerCase());
  }

  private normalizeNumber(value?: string | number, defaultValue = 0) {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'number') return value;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }

  private normalizeDate(value?: string | Date) {
    if (!value) return undefined;
    return value instanceof Date ? value : new Date(value);
  }

  private mapActivity(activity: Activity) {
    return {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      summary: activity.summary,
      location: activity.location,
      participantsLabel: activity.participantsLabel,
      startDate: activity.startDate,
      endDate: activity.endDate,
      coverImageUrl: activity.coverImageUrl,
      published: activity.published,
      featured: activity.featured,
      showInActivitiesPage: activity.showInActivitiesPage,
      displayOrder: activity.displayOrder,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
      pillar: activity.pillar
        ? {
            id: activity.pillar.id,
            name: activity.pillar.name,
            slug: activity.pillar.slug,
            color: activity.pillar.color,
            icon: activity.pillar.icon,
          }
        : null,
      type: activity.type
        ? {
            id: activity.type.id,
            name: activity.type.name,
            slug: activity.type.slug,
            color: activity.type.color,
            icon: activity.type.icon,
          }
        : null,
      gallery:
        activity.gallery?.sort((a, b) => a.order - b.order).map((image) => ({
          id: image.id,
          url: image.url,
          alt: image.alt,
          filename: image.filename,
          order: image.order,
        })) || [],
    };
  }

  private relationById<T extends { id: string }>(id?: string): T | undefined {
    return id ? ({ id } as T) : undefined;
  }

  async create(
    dto: CreateActivityDto,
    files: {
      coverImage?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    },
  ) {
    try {
      const count = await this.activityRepository.count();
      const coverImage = files.coverImage?.[0];
      const galleryFiles = files.gallery || [];

      const coverImageUrl = coverImage
        ? await uploadSingleImage(coverImage, 'jmv_ecuador/activities/cover')
        : null;
      const galleryUrls = await uploadImagesToFolder(
        galleryFiles,
        'jmv_ecuador/activities/gallery',
      );

      const activity = this.activityRepository.create({
        title: dto.title,
        description: dto.description,
        summary: dto.summary,
        location: dto.location,
        participantsLabel: dto.participantsLabel,
        startDate: this.normalizeDate(dto.startDate),
        endDate: this.normalizeDate(dto.endDate),
        coverImageUrl: coverImageUrl ?? undefined,
        published: this.normalizeBoolean(dto.published, true),
        featured: this.normalizeBoolean(dto.featured, false),
        showInActivitiesPage: this.normalizeBoolean(dto.showInActivitiesPage, true),
        displayOrder: this.normalizeNumber(dto.displayOrder, count + 1),
        pillar: this.relationById<ActivityPillar>(dto.pillarId),
        type: this.relationById<ActivityTypeCatalog>(dto.typeId),
        gallery: galleryUrls.map((url, index) =>
          this.activityImageRepository.create({
            url,
            filename: galleryFiles[index]?.originalname,
            alt: dto.title,
            order: index + 1,
          }),
        ),
      });

      const saved = await this.activityRepository.save(activity);
      void this.revalidation.revalidate(ACTIVITY_TAGS);
      return this.mapActivity(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll(filterDto: FilterActivitiesDto) {
    try {
      const {
        limit = 50,
        offset = 0,
        pillarId,
        typeId,
        published,
        search,
      } = filterDto;

      const qb = this.activityRepository
        .createQueryBuilder('activity')
        .leftJoinAndSelect('activity.pillar', 'pillar')
        .leftJoinAndSelect('activity.type', 'type')
        .leftJoinAndSelect('activity.gallery', 'gallery')
        .orderBy('activity.displayOrder', 'ASC')
        .addOrderBy('activity.startDate', 'DESC')
        .skip(offset)
        .take(limit);

      if (pillarId) {
        qb.andWhere('pillar.id = :pillarId', { pillarId });
      }
      if (typeId) {
        qb.andWhere('type.id = :typeId', { typeId });
      }
      if (published !== undefined) {
        qb.andWhere('activity.published = :published', {
          published: this.normalizeBoolean(published, true),
        });
      }
      if (search) {
        qb.andWhere(
          '(activity.title ILIKE :search OR activity.description ILIKE :search)',
          { search: `%${search}%` },
        );
      }

      const [items, total] = await qb.getManyAndCount();
      return {
        total,
        items: items.map((item) => this.mapActivity(item)),
      };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findPublic(filterDto: FilterActivitiesDto) {
    return this.findAll({ ...filterDto, published: 'true' });
  }

  async findOne(id: string) {
    const activity = await this.activityRepository.findOne({ where: { id } });
    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }
    return this.mapActivity(activity);
  }

  async update(
    id: string,
    dto: UpdateActivityDto,
    files: {
      coverImage?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    },
  ) {
    try {
      const activity = await this.activityRepository.findOne({ where: { id } });
      if (!activity) {
        throw new NotFoundException('Actividad no encontrada');
      }

      if (files.coverImage?.[0]) {
        activity.coverImageUrl =
          (await uploadSingleImage(
            files.coverImage[0],
            'jmv_ecuador/activities/cover',
          )) ?? activity.coverImageUrl;
      }

      if (files.gallery && files.gallery.length > 0) {
        const galleryUrls = await uploadImagesToFolder(
          files.gallery,
          'jmv_ecuador/activities/gallery',
        );
        activity.gallery = galleryUrls.map((url, index) =>
          this.activityImageRepository.create({
            url,
            filename: files.gallery?.[index]?.originalname,
            alt: dto.title || activity.title,
            order: index + 1,
          }),
        );
      }

      activity.title = dto.title ?? activity.title;
      activity.description = dto.description ?? activity.description;
      activity.summary = dto.summary ?? activity.summary;
      activity.location = dto.location ?? activity.location;
      activity.participantsLabel =
        dto.participantsLabel ?? activity.participantsLabel;
      activity.startDate =
        this.normalizeDate(dto.startDate) ?? activity.startDate;
      activity.endDate = this.normalizeDate(dto.endDate) ?? activity.endDate;
      activity.published =
        dto.published !== undefined
          ? this.normalizeBoolean(dto.published, activity.published)
          : activity.published;
      activity.featured =
        dto.featured !== undefined
          ? this.normalizeBoolean(dto.featured, activity.featured)
          : activity.featured;
      activity.showInActivitiesPage =
        dto.showInActivitiesPage !== undefined
          ? this.normalizeBoolean(
              dto.showInActivitiesPage,
              activity.showInActivitiesPage,
            )
          : activity.showInActivitiesPage;
      activity.displayOrder =
        dto.displayOrder !== undefined
          ? this.normalizeNumber(dto.displayOrder, activity.displayOrder)
          : activity.displayOrder;
      activity.pillar = dto.pillarId
        ? this.relationById<ActivityPillar>(dto.pillarId)
        : activity.pillar;
      activity.type = dto.typeId
        ? this.relationById<ActivityTypeCatalog>(dto.typeId)
        : activity.type;

      const saved = await this.activityRepository.save(activity);
      void this.revalidation.revalidate(ACTIVITY_TAGS);
      return this.mapActivity(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const activity = await this.activityRepository.findOne({ where: { id } });
      if (!activity) {
        throw new NotFoundException('Actividad no encontrada');
      }
      await this.activityRepository.remove(activity);
      void this.revalidation.revalidate(ACTIVITY_TAGS);
      return { message: 'Actividad eliminada correctamente' };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: unknown): never {
    this.logger.error(error);
    if (error instanceof NotFoundException) {
      throw error;
    }
    throw new InternalServerErrorException('Error al gestionar actividades');
  }
}
