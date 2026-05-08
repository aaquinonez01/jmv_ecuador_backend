import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Testimonial } from './entities/testimonial.entity';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { FilterTestimonialsDto } from './dto/filter-testimonials.dto';
import { uploadSingleImage } from 'src/helpers/file-upload.helper';
import { RevalidationService } from '../common/revalidation/revalidation.service';

const TESTIMONIAL_TAGS = ['testimonials_home', 'testimonials_historia'];

@Injectable()
export class TestimonialsService {
  private readonly logger = new Logger('TestimonialsService');

  constructor(
    @InjectRepository(Testimonial)
    private readonly repository: Repository<Testimonial>,
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

  private mapTestimonial(item: Testimonial) {
    return {
      id: item.id,
      name: item.name,
      role: item.role,
      location: item.location,
      quote: item.quote,
      rating: item.rating,
      imageUrl: item.imageUrl,
      active: item.active,
      displayOrder: item.displayOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async create(dto: CreateTestimonialDto, image?: Express.Multer.File) {
    try {
      const count = await this.repository.count();
      const imageUrl = image
        ? await uploadSingleImage(image, 'jmv_ecuador/testimonials')
        : null;

      const testimonial = this.repository.create({
        name: dto.name,
        role: dto.role,
        location: dto.location,
        quote: dto.quote,
        rating: this.normalizeNumber(dto.rating, 5),
        imageUrl: imageUrl ?? undefined,
        active: this.normalizeBoolean(dto.active, true),
        displayOrder: this.normalizeNumber(dto.displayOrder, count + 1),
      });

      const saved = await this.repository.save(testimonial);
      void this.revalidation.revalidate(TESTIMONIAL_TAGS);
      return this.mapTestimonial(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll(filterDto: FilterTestimonialsDto) {
    try {
      const {
        limit = '50',
        offset = '0',
        active,
        search,
      } = filterDto;

      const qb = this.repository
        .createQueryBuilder('testimonial')
        .orderBy('testimonial.displayOrder', 'ASC')
        .addOrderBy('testimonial.createdAt', 'DESC')
        .skip(this.normalizeNumber(offset, 0))
        .take(this.normalizeNumber(limit, 50));

      if (active !== undefined) {
        qb.andWhere('testimonial.active = :active', {
          active: this.normalizeBoolean(active, true),
        });
      }

      if (search) {
        qb.andWhere(
          '(testimonial.name ILIKE :search OR testimonial.role ILIKE :search OR testimonial.quote ILIKE :search)',
          { search: `%${search}%` },
        );
      }

      const [items, total] = await qb.getManyAndCount();

      return {
        total,
        items: items.map((item) => this.mapTestimonial(item)),
      };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findPublic(filterDto: FilterTestimonialsDto) {
    return this.findAll({ ...filterDto, active: 'true', limit: filterDto.limit || '6' });
  }

  async findOne(id: string) {
    const testimonial = await this.repository.findOne({ where: { id } });
    if (!testimonial) {
      throw new NotFoundException('Testimonio no encontrado');
    }
    return this.mapTestimonial(testimonial);
  }

  async update(
    id: string,
    dto: UpdateTestimonialDto,
    image?: Express.Multer.File,
  ) {
    try {
      const testimonial = await this.repository.findOne({ where: { id } });
      if (!testimonial) {
        throw new NotFoundException('Testimonio no encontrado');
      }

      if (image) {
        testimonial.imageUrl =
          (await uploadSingleImage(image, 'jmv_ecuador/testimonials')) ??
          testimonial.imageUrl;
      }

      testimonial.name = dto.name ?? testimonial.name;
      testimonial.role = dto.role ?? testimonial.role;
      testimonial.location = dto.location ?? testimonial.location;
      testimonial.quote = dto.quote ?? testimonial.quote;
      testimonial.rating =
        dto.rating !== undefined
          ? this.normalizeNumber(dto.rating, testimonial.rating)
          : testimonial.rating;
      testimonial.active =
        dto.active !== undefined
          ? this.normalizeBoolean(dto.active, testimonial.active)
          : testimonial.active;
      testimonial.displayOrder =
        dto.displayOrder !== undefined
          ? this.normalizeNumber(dto.displayOrder, testimonial.displayOrder)
          : testimonial.displayOrder;

      const saved = await this.repository.save(testimonial);
      void this.revalidation.revalidate(TESTIMONIAL_TAGS);
      return this.mapTestimonial(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const testimonial = await this.repository.findOne({ where: { id } });
      if (!testimonial) {
        throw new NotFoundException('Testimonio no encontrado');
      }

      await this.repository.remove(testimonial);
      void this.revalidation.revalidate(TESTIMONIAL_TAGS);
      return { message: 'Testimonio eliminado correctamente' };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: unknown): never {
    this.logger.error(error);
    if (error instanceof NotFoundException) {
      throw error;
    }
    throw new InternalServerErrorException('Error al gestionar testimonios');
  }
}
