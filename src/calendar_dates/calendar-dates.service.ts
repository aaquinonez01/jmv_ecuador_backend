import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarDate } from './entities/calendar-date.entity';
import { CreateCalendarDateDto } from './dto/create-calendar-date.dto';
import { UpdateCalendarDateDto } from './dto/update-calendar-date.dto';
import { CALENDAR_DATES_SEED } from './seed/calendar-dates.seed';
import {
  deleteImageByPublicId,
  uploadImageWithPublicId,
} from 'src/helpers/file-upload.helper';
import { RevalidationService } from '../common/revalidation/revalidation.service';

const CALENDAR_TAGS = ['calendar_dates'];
const CALENDAR_FOLDER = 'jmv_ecuador/calendar_dates';
// Días máximos por mes (febrero admite el 29)
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const OPTIONAL_TEXT_FIELDS = [
  'subtitle',
  'story',
  'quote',
  'quoteAuthor',
  'challenge',
  'source',
] as const;

@Injectable()
export class CalendarDatesService implements OnApplicationBootstrap {
  private readonly logger = new Logger('CalendarDatesService');

  constructor(
    @InjectRepository(CalendarDate)
    private readonly repository: Repository<CalendarDate>,
    private readonly revalidation: RevalidationService,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'production') return;
    if (CALENDAR_DATES_SEED.length === 0) return;
    try {
      if ((await this.repository.count()) > 0) return;
      await this.repository.save(
        CALENDAR_DATES_SEED.map((item, index) =>
          this.repository.create({
            ...item,
            verified: item.verified ?? false,
            published: item.published ?? true,
            displayOrder: item.displayOrder ?? index,
          }),
        ),
      );
      this.logger.log(
        `Semilla del Año Vicenciano: ${CALENDAR_DATES_SEED.length} fechas`,
      );
    } catch (error) {
      // Nunca impedir el arranque
      this.logger.error(
        `No se pudo cargar la semilla del calendario: ${(error as Error).message}`,
      );
    }
  }

  private mapDate(item: CalendarDate) {
    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      subtitle: item.subtitle ?? null,
      month: item.month,
      day: item.day,
      year: item.year ?? null,
      category: item.category,
      summary: item.summary,
      story: item.story ?? null,
      quote: item.quote ?? null,
      quoteAuthor: item.quoteAuthor ?? null,
      challenge: item.challenge ?? null,
      imageUrl: item.imageUrl ?? null,
      source: item.source ?? null,
      verified: item.verified,
      published: item.published,
      displayOrder: item.displayOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private assertValidDay(month: number, day: number) {
    if (day > DAYS_IN_MONTH[month - 1]) {
      throw new BadRequestException(
        `El día ${day} no existe en el mes ${month}`,
      );
    }
  }

  private slugify(text: string) {
    const slug = text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 110)
      .replace(/-+$/g, '');
    return slug || 'fecha';
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
      throw new ConflictException(`Ya existe una fecha con el slug "${slug}"`);
    }
  }

  private revalidate(...slugs: string[]) {
    const paths = ['/calendario', '/'];
    for (const slug of new Set(slugs)) paths.push(`/calendario/${slug}`);
    void this.revalidation.revalidate(CALENDAR_TAGS, paths);
  }

  private async removeCloudinaryImage(publicId?: string | null) {
    try {
      await deleteImageByPublicId(publicId);
    } catch (error) {
      this.logger.warn(
        `No se pudo borrar la imagen ${publicId} de Cloudinary: ${(error as Error).message}`,
      );
    }
  }

  async create(dto: CreateCalendarDateDto, image?: Express.Multer.File) {
    try {
      this.assertValidDay(dto.month, dto.day);

      let slug: string;
      if (dto.slug) {
        await this.assertSlugAvailable(dto.slug);
        slug = dto.slug;
      } else {
        slug = await this.uniqueSlug(this.slugify(dto.title));
      }

      const uploaded = image
        ? await uploadImageWithPublicId(image, CALENDAR_FOLDER)
        : null;

      const item = this.repository.create({
        slug,
        title: dto.title,
        subtitle: dto.subtitle ?? null,
        month: dto.month,
        day: dto.day,
        year: dto.year ?? null,
        category: dto.category,
        summary: dto.summary,
        story: dto.story ?? null,
        quote: dto.quote ?? null,
        quoteAuthor: dto.quoteAuthor ?? null,
        challenge: dto.challenge ?? null,
        imageUrl: uploaded?.url ?? dto.imageUrl ?? null,
        imagePublicId: uploaded?.publicId ?? null,
        source: dto.source ?? null,
        verified: dto.verified ?? false,
        published: dto.published ?? true,
        displayOrder: dto.displayOrder ?? 0,
      });

      const saved = await this.repository.save(item);
      this.revalidate(saved.slug);
      return this.mapDate(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll() {
    try {
      const items = await this.repository.find({
        order: { month: 'ASC', day: 'ASC', displayOrder: 'ASC', title: 'ASC' },
      });
      return { items: items.map((item) => this.mapDate(item)) };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findPublic() {
    try {
      const items = await this.repository.find({
        where: { published: true },
        order: { month: 'ASC', day: 'ASC', displayOrder: 'ASC', title: 'ASC' },
      });
      return { items: items.map((item) => this.mapDate(item)) };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findPublicBySlug(slug: string) {
    const item = await this.repository.findOne({
      where: { slug, published: true },
    });
    if (!item) throw new NotFoundException('Fecha no encontrada');
    return this.mapDate(item);
  }

  async findOne(id: string) {
    const item = await this.repository.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Fecha no encontrada');
    return this.mapDate(item);
  }

  async update(
    id: string,
    dto: UpdateCalendarDateDto,
    image?: Express.Multer.File,
  ) {
    try {
      const item = await this.repository.findOne({ where: { id } });
      if (!item) throw new NotFoundException('Fecha no encontrada');

      const previousSlug = item.slug;
      const month = dto.month ?? item.month;
      const day = dto.day ?? item.day;
      this.assertValidDay(month, day);

      if (dto.slug && dto.slug !== item.slug) {
        await this.assertSlugAvailable(dto.slug, item.id);
        item.slug = dto.slug;
      }

      // Primero se sube la imagen nueva; la anterior se borra tras guardar
      let staleImageId: string | null = null;
      if (image) {
        const uploaded = await uploadImageWithPublicId(image, CALENDAR_FOLDER);
        staleImageId = item.imagePublicId ?? null;
        item.imageUrl = uploaded.url;
        item.imagePublicId = uploaded.publicId;
      } else if (dto.removeImage) {
        staleImageId = item.imagePublicId ?? null;
        item.imageUrl = null;
        item.imagePublicId = null;
      } else if (dto.imageUrl !== undefined && dto.imageUrl !== item.imageUrl) {
        staleImageId = item.imagePublicId ?? null;
        item.imageUrl = dto.imageUrl;
        item.imagePublicId = null;
      }

      item.month = month;
      item.day = day;
      if (dto.title) item.title = dto.title;
      if (dto.summary) item.summary = dto.summary;
      if (dto.category) item.category = dto.category;
      if (dto.year !== undefined) item.year = dto.year;
      for (const field of OPTIONAL_TEXT_FIELDS) {
        if (dto[field] !== undefined) item[field] = dto[field];
      }
      if (dto.verified !== undefined) item.verified = dto.verified;
      if (dto.published !== undefined) item.published = dto.published;
      if (dto.displayOrder !== undefined && dto.displayOrder !== null) {
        item.displayOrder = dto.displayOrder;
      }

      const saved = await this.repository.save(item);
      if (staleImageId) await this.removeCloudinaryImage(staleImageId);
      this.revalidate(previousSlug, saved.slug);
      return this.mapDate(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const item = await this.repository.findOne({ where: { id } });
      if (!item) throw new NotFoundException('Fecha no encontrada');
      const { slug, imagePublicId } = item;
      await this.repository.remove(item);
      await this.removeCloudinaryImage(imagePublicId);
      this.revalidate(slug);
      return { message: 'Fecha eliminada correctamente' };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: unknown): never {
    if (error instanceof HttpException) throw error;
    if ((error as { code?: string })?.code === '23505') {
      throw new ConflictException('Ya existe una fecha con ese slug');
    }
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Error al gestionar el Año Vicenciano',
    );
  }
}
