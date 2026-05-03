import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Zona } from './entities/zona.entity';
import { CreateZonaDto } from './dto/create-zona.dto';
import { UpdateZonaDto } from './dto/update-zona.dto';

@Injectable()
export class ZonasService {
  constructor(
    @InjectRepository(Zona)
    private readonly zonaRepository: Repository<Zona>,
  ) {}

  private readonly logger = new Logger('ZonasService');

  async create(createZonaDto: CreateZonaDto) {
    try {
      const zona = this.zonaRepository.create(createZonaDto);
      return await this.zonaRepository.save(zona);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll() {
    return this.zonaRepository.find({
      relations: ['comunidades'],
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: string) {
    const zona = await this.zonaRepository.findOne({
      where: { id },
      relations: ['comunidades'],
    });

    if (!zona) {
      throw new NotFoundException('Zona no encontrada');
    }

    return zona;
  }

  async update(id: string, updateZonaDto: UpdateZonaDto) {
    try {
      const zona = await this.zonaRepository.preload({
        id,
        ...updateZonaDto,
      });

      if (!zona) {
        throw new NotFoundException('Zona no encontrada');
      }

      return await this.zonaRepository.save(zona);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const zona = await this.zonaRepository.findOne({ where: { id } });
      if (!zona) {
        throw new NotFoundException('Zona no encontrada');
      }

      await this.zonaRepository.remove(zona);
      return { message: 'Zona eliminada correctamente' };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: unknown): never {
    this.logger.error(error);

    if (error instanceof NotFoundException) {
      throw error;
    }

    throw new InternalServerErrorException('Error al realizar la operación');
  }
}

