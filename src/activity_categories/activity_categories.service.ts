import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RevalidationService } from '../common/revalidation/revalidation.service';
import { Repository } from 'typeorm';
import { ActivityCategory } from './entities/activity-category.entity';
import { CreateActivityCategoryDto } from './dto/create-activity-category.dto';
import { UpdateActivityCategoryDto } from './dto/update-activity-category.dto';

const CATEGORY_TAGS = ['activity_categories', 'galeria_actividades'];

@Injectable()
export class ActivityCategoriesService {
  constructor(
    @InjectRepository(ActivityCategory)
    private readonly repo: Repository<ActivityCategory>,
    private readonly revalidation: RevalidationService,
  ) {}

  private readonly logger = new Logger('ActivityCategoriesService');

  async create(dto: CreateActivityCategoryDto) {
    try {
      const exists = await this.repo.findOne({ where: { slug: dto.slug } });
      if (exists) {
        throw new InternalServerErrorException('Slug ya existe');
      }
      const cat = this.repo.create({ ...dto, active: dto.active ?? true });
      const saved = await this.repo.save(cat);
      void this.revalidation.revalidate(CATEGORY_TAGS);
      return saved;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Error al crear categoría');
    }
  }

  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async update(id: string, dto: UpdateActivityCategoryDto) {
    try {
      const cat = await this.repo.findOne({ where: { id } });
      if (!cat) throw new NotFoundException('Categoría no encontrada');
      const merged = this.repo.merge(cat, dto);
      const saved = await this.repo.save(merged);
      void this.revalidation.revalidate(CATEGORY_TAGS);
      return saved;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Error al actualizar categoría');
    }
  }

  async remove(id: string) {
    try {
      const cat = await this.repo.findOne({ where: { id } });
      if (!cat) throw new NotFoundException('Categoría no encontrada');
      await this.repo.remove(cat);
      void this.revalidation.revalidate(CATEGORY_TAGS);
      return { message: 'Categoría eliminada' };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Error al eliminar categoría');
    }
  }
}
