import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpcomingActivity } from './entities/upcoming-activity.entity';
import { UpcomingActivityDocument } from './entities/upcoming-activity-document.entity';
import { ActivityPillar } from 'src/activity_pillars/entities/activity-pillar.entity';
import { ActivityTypeCatalog } from 'src/activity_types/entities/activity-type.entity';
import { CreateUpcomingActivityDto } from './dto/create-upcoming-activity.dto';
import { UpdateUpcomingActivityDto } from './dto/update-upcoming-activity.dto';
import { FilterUpcomingActivitiesDto } from './dto/filter-upcoming-activities.dto';
import {
  uploadRawFilesToFolder,
  uploadSingleImage,
} from 'src/helpers/file-upload.helper';

@Injectable()
export class UpcomingActivitiesService {
  private readonly logger = new Logger('UpcomingActivitiesService');

  constructor(
    @InjectRepository(UpcomingActivity)
    private readonly upcomingRepository: Repository<UpcomingActivity>,
    @InjectRepository(UpcomingActivityDocument)
    private readonly documentRepository: Repository<UpcomingActivityDocument>,
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

  private parseDocumentTypes(value?: string, count = 0): string[] {
    if (!value) return new Array<string>(count).fill('otro');
    const parsed = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    while (parsed.length < count) {
      parsed.push('otro');
    }
    return parsed;
  }

  private mapUpcoming(activity: UpcomingActivity) {
    return {
      id: activity.id,
      title: activity.title,
      summary: activity.summary,
      description: activity.description,
      location: activity.location,
      startDate: activity.startDate,
      endDate: activity.endDate,
      maxRegistrationDate: activity.maxRegistrationDate,
      externalUrl: activity.externalUrl,
      participantsLabel: activity.participantsLabel,
      registrationStatus: activity.registrationStatus,
      countdownTargetType: activity.countdownTargetType,
      coverImageUrl: activity.coverImageUrl,
      published: activity.published,
      featuredInHome: activity.featuredInHome,
      showInHome: activity.showInHome,
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
      documents:
        activity.documents?.sort((a, b) => a.order - b.order).map((document) => ({
          id: document.id,
          name: document.name,
          fileUrl: document.fileUrl,
          fileType: document.fileType,
          documentType: document.documentType,
          order: document.order,
        })) || [],
    };
  }

  private relationById<T extends { id: string }>(id?: string): T | undefined {
    return id ? ({ id } as T) : undefined;
  }

  async create(
    dto: CreateUpcomingActivityDto,
    files: {
      coverImage?: Express.Multer.File[];
      documents?: Express.Multer.File[];
    },
  ) {
    try {
      const count = await this.upcomingRepository.count();
      const coverImage = files.coverImage?.[0];
      const documentFiles = files.documents || [];
      const coverImageUrl = coverImage
        ? await uploadSingleImage(
            coverImage,
            'jmv_ecuador/upcoming_activities/cover',
          )
        : null;
      const documentUrls = await uploadRawFilesToFolder(
        documentFiles,
        'jmv_ecuador/upcoming_activities/documents',
      );
      const documentTypes = this.parseDocumentTypes(
        dto.documentTypes,
        documentUrls.length,
      );

      const activity = this.upcomingRepository.create({
        title: dto.title,
        summary: dto.summary,
        description: dto.description,
        location: dto.location,
        startDate: this.normalizeDate(dto.startDate),
        endDate: this.normalizeDate(dto.endDate),
        maxRegistrationDate: this.normalizeDate(dto.maxRegistrationDate),
        externalUrl: dto.externalUrl,
        participantsLabel: dto.participantsLabel,
        registrationStatus: dto.registrationStatus,
        countdownTargetType: dto.countdownTargetType || 'event',
        coverImageUrl: coverImageUrl ?? undefined,
        published: this.normalizeBoolean(dto.published, true),
        featuredInHome: this.normalizeBoolean(dto.featuredInHome, false),
        showInHome: this.normalizeBoolean(dto.showInHome, true),
        displayOrder: this.normalizeNumber(dto.displayOrder, count + 1),
        pillar: this.relationById<ActivityPillar>(dto.pillarId),
        type: this.relationById<ActivityTypeCatalog>(dto.typeId),
        documents: documentUrls.map((url, index) =>
          this.documentRepository.create({
            name: documentFiles[index]?.originalname || `documento-${index + 1}`,
            fileUrl: url,
            fileType: documentFiles[index]?.mimetype,
            documentType: documentTypes[index],
            order: index + 1,
          }),
        ),
      });

      const saved = await this.upcomingRepository.save(activity);
      return this.mapUpcoming(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll(filterDto: FilterUpcomingActivitiesDto) {
    try {
      const {
        limit = 50,
        offset = 0,
        pillarId,
        typeId,
        published,
        showInHome,
        search,
      } = filterDto;

      const qb = this.upcomingRepository
        .createQueryBuilder('activity')
        .leftJoinAndSelect('activity.pillar', 'pillar')
        .leftJoinAndSelect('activity.type', 'type')
        .leftJoinAndSelect('activity.documents', 'documents')
        .orderBy('activity.featuredInHome', 'DESC')
        .addOrderBy('activity.displayOrder', 'ASC')
        .addOrderBy('activity.startDate', 'ASC')
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
      if (showInHome !== undefined) {
        qb.andWhere('activity.showInHome = :showInHome', {
          showInHome: this.normalizeBoolean(showInHome, true),
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
        items: items.map((item) => this.mapUpcoming(item)),
      };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findPublic(filterDto: FilterUpcomingActivitiesDto) {
    return this.findAll({ ...filterDto, published: 'true' });
  }

  async findHome() {
    return this.findAll({
      published: 'true',
      showInHome: 'true',
      limit: 6,
      offset: 0,
    });
  }

  async findOne(id: string) {
    const activity = await this.upcomingRepository.findOne({ where: { id } });
    if (!activity) {
      throw new NotFoundException('Proxima actividad no encontrada');
    }
    return this.mapUpcoming(activity);
  }

  async update(
    id: string,
    dto: UpdateUpcomingActivityDto,
    files: {
      coverImage?: Express.Multer.File[];
      documents?: Express.Multer.File[];
    },
  ) {
    try {
      const activity = await this.upcomingRepository.findOne({ where: { id } });
      if (!activity) {
        throw new NotFoundException('Proxima actividad no encontrada');
      }

      if (files.coverImage?.[0]) {
        activity.coverImageUrl =
          (await uploadSingleImage(
            files.coverImage[0],
            'jmv_ecuador/upcoming_activities/cover',
          )) ?? activity.coverImageUrl;
      }

      if (files.documents && files.documents.length > 0) {
        const documentUrls = await uploadRawFilesToFolder(
          files.documents,
          'jmv_ecuador/upcoming_activities/documents',
        );
        const documentTypes = this.parseDocumentTypes(
          dto.documentTypes,
          documentUrls.length,
        );
        activity.documents = documentUrls.map((url, index) =>
          this.documentRepository.create({
            name:
              files.documents?.[index]?.originalname || `documento-${index + 1}`,
            fileUrl: url,
            fileType: files.documents?.[index]?.mimetype,
            documentType: documentTypes[index],
            order: index + 1,
          }),
        );
      }

      activity.title = dto.title ?? activity.title;
      activity.summary = dto.summary ?? activity.summary;
      activity.description = dto.description ?? activity.description;
      activity.location = dto.location ?? activity.location;
      activity.startDate =
        this.normalizeDate(dto.startDate) ?? activity.startDate;
      activity.endDate = this.normalizeDate(dto.endDate) ?? activity.endDate;
      activity.maxRegistrationDate =
        this.normalizeDate(dto.maxRegistrationDate) ??
        activity.maxRegistrationDate;
      activity.externalUrl = dto.externalUrl ?? activity.externalUrl;
      activity.participantsLabel =
        dto.participantsLabel ?? activity.participantsLabel;
      activity.registrationStatus =
        dto.registrationStatus ?? activity.registrationStatus;
      activity.countdownTargetType =
        dto.countdownTargetType ?? activity.countdownTargetType;
      activity.published =
        dto.published !== undefined
          ? this.normalizeBoolean(dto.published, activity.published)
          : activity.published;
      activity.featuredInHome =
        dto.featuredInHome !== undefined
          ? this.normalizeBoolean(dto.featuredInHome, activity.featuredInHome)
          : activity.featuredInHome;
      activity.showInHome =
        dto.showInHome !== undefined
          ? this.normalizeBoolean(dto.showInHome, activity.showInHome)
          : activity.showInHome;
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

      const saved = await this.upcomingRepository.save(activity);
      return this.mapUpcoming(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const activity = await this.upcomingRepository.findOne({ where: { id } });
      if (!activity) {
        throw new NotFoundException('Proxima actividad no encontrada');
      }
      await this.upcomingRepository.remove(activity);
      return { message: 'Proxima actividad eliminada correctamente' };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: unknown): never {
    this.logger.error(error);
    if (error instanceof NotFoundException) {
      throw error;
    }
    throw new InternalServerErrorException(
      'Error al gestionar proximas actividades',
    );
  }
}
