import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comunidad } from './entities/comunidad.entity';
import { Zona } from 'src/zonas/entities/zona.entity';
import { CreateComunidadDto } from './dto/create-comunidad.dto';
import { UpdateComunidadDto } from './dto/update-comunidad.dto';

@Injectable()
export class ComunidadesService {
  constructor(
    @InjectRepository(Comunidad)
    private readonly comunidadRepository: Repository<Comunidad>,
    @InjectRepository(Zona)
    private readonly zonaRepository: Repository<Zona>,
  ) {}

  private readonly logger = new Logger('ComunidadesService');

  async create(createComunidadDto: CreateComunidadDto) {
    try {
      const zona = await this.zonaRepository.findOne({
        where: { id: createComunidadDto.zonaId },
      });

      if (!zona) {
        throw new NotFoundException('Zona no encontrada');
      }

      const comunidad = this.comunidadRepository.create({
        nombre: createComunidadDto.nombre,
        ciudad: createComunidadDto.ciudad,
        correoElectronico: createComunidadDto.correoElectronico,
        zona,
      });

      return await this.comunidadRepository.save(comunidad);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll() {
    return this.comunidadRepository.find({
      relations: ['zona'],
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: string) {
    const comunidad = await this.comunidadRepository.findOne({
      where: { id },
      relations: ['zona'],
    });

    if (!comunidad) {
      throw new NotFoundException('Comunidad no encontrada');
    }

    return comunidad;
  }

  async update(id: string, updateComunidadDto: UpdateComunidadDto) {
    try {
      const comunidad = await this.comunidadRepository.findOne({
        where: { id },
        relations: ['zona'],
      });

      if (!comunidad) {
        throw new NotFoundException('Comunidad no encontrada');
      }

      if (updateComunidadDto.zonaId) {
        const zona = await this.zonaRepository.findOne({
          where: { id: updateComunidadDto.zonaId },
        });

        if (!zona) {
          throw new NotFoundException('Zona no encontrada');
        }

        comunidad.zona = zona;
      }

      if (updateComunidadDto.nombre !== undefined) {
        comunidad.nombre = updateComunidadDto.nombre;
      }

      if (updateComunidadDto.ciudad !== undefined) {
        comunidad.ciudad = updateComunidadDto.ciudad;
      }

      if (updateComunidadDto.correoElectronico !== undefined) {
        comunidad.correoElectronico = updateComunidadDto.correoElectronico;
      }

      return await this.comunidadRepository.save(comunidad);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const comunidad = await this.comunidadRepository.findOne({ where: { id } });
      if (!comunidad) {
        throw new NotFoundException('Comunidad no encontrada');
      }

      await this.comunidadRepository.remove(comunidad);
      return { message: 'Comunidad eliminada correctamente' };
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

