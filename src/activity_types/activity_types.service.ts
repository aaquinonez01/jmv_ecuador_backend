import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityTypeCatalog } from './entities/activity-type.entity';
import { CreateActivityTypeDto } from './dto/create-activity-type.dto';
import { UpdateActivityTypeDto } from './dto/update-activity-type.dto';

@Injectable()
export class ActivityTypesService {
  private readonly logger = new Logger('ActivityTypesService');

  constructor(
    @InjectRepository(ActivityTypeCatalog)
    private readonly repo: Repository<ActivityTypeCatalog>,
  ) {}

  async create(dto: CreateActivityTypeDto) {
    try {
      const slug = dto.slug || this.generateSlug(dto.name);
      const exists = await this.repo.findOne({
        where: [{ slug }, { name: dto.name }],
      });
      if (exists) {
        throw new ConflictException('Ya existe un tipo de actividad con ese nombre o slug');
      }

      const count = await this.repo.count();
      const type = this.repo.create({
        ...dto,
        slug,
        active: dto.active ?? true,
        order: count + 1,
      });
      return await this.repo.save(type);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  findAll() {
    return this.repo.find({ order: { order: 'ASC', name: 'ASC' } });
  }

  async findOne(id: string) {
    const type = await this.repo.findOne({ where: { id } });
    if (!type) {
      throw new NotFoundException('Tipo de actividad no encontrado');
    }
    return type;
  }

  async update(id: string, dto: UpdateActivityTypeDto) {
    try {
      const type = await this.findOne(id);
      const slug = dto.slug || (dto.name ? this.generateSlug(dto.name) : type.slug);
      const merged = this.repo.merge(type, { ...dto, slug });
      return await this.repo.save(merged);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const type = await this.findOne(id);
      await this.repo.remove(type);
      return { message: 'Tipo de actividad eliminado correctamente' };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private generateSlug(name: string) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private handleExceptions(error: unknown): never {
    this.logger.error(error);
    if (error instanceof ConflictException || error instanceof NotFoundException) {
      throw error;
    }
    throw new InternalServerErrorException(
      'Error al gestionar los tipos de actividad',
    );
  }
}
