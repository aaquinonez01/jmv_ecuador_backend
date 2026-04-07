import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityPillar } from './entities/activity-pillar.entity';
import { CreateActivityPillarDto } from './dto/create-activity-pillar.dto';
import { UpdateActivityPillarDto } from './dto/update-activity-pillar.dto';

@Injectable()
export class ActivityPillarsService {
  private readonly logger = new Logger('ActivityPillarsService');

  constructor(
    @InjectRepository(ActivityPillar)
    private readonly repo: Repository<ActivityPillar>,
  ) {}

  async create(dto: CreateActivityPillarDto) {
    try {
      const slug = dto.slug || this.generateSlug(dto.name);
      const exists = await this.repo.findOne({
        where: [{ slug }, { name: dto.name }],
      });
      if (exists) {
        throw new ConflictException('Ya existe un pilar con ese nombre o slug');
      }

      const count = await this.repo.count();
      const pillar = this.repo.create({
        ...dto,
        slug,
        active: dto.active ?? true,
        order: count + 1,
      });
      return await this.repo.save(pillar);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  findAll() {
    return this.repo.find({ order: { order: 'ASC', name: 'ASC' } });
  }

  async findOne(id: string) {
    const pillar = await this.repo.findOne({ where: { id } });
    if (!pillar) {
      throw new NotFoundException('Pilar no encontrado');
    }
    return pillar;
  }

  async update(id: string, dto: UpdateActivityPillarDto) {
    try {
      const pillar = await this.findOne(id);
      const slug =
        dto.slug || (dto.name ? this.generateSlug(dto.name) : pillar.slug);
      const merged = this.repo.merge(pillar, { ...dto, slug });
      return await this.repo.save(merged);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const pillar = await this.findOne(id);
      await this.repo.remove(pillar);
      return { message: 'Pilar eliminado correctamente' };
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
    if (
      error instanceof ConflictException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }
    throw new InternalServerErrorException(
      'Error al gestionar los pilares de actividad',
    );
  }
}
