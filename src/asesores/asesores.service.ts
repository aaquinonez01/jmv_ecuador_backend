import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { uploadSingleImage } from 'src/helpers/file-upload.helper';
import { Asesor, TipoAsesor } from './entities/asesor.entity';
import { CreateAsesorDto } from './dto/create-asesor.dto';
import { UpdateAsesorDto } from './dto/update-asesor.dto';
import { RevalidationService } from '../common/revalidation/revalidation.service';

const ASESOR_TAGS = ['asesores_actuales'];

@Injectable()
export class AsesoresService {
  private readonly logger = new Logger('AsesoresService');

  constructor(
    @InjectRepository(Asesor)
    private readonly repository: Repository<Asesor>,
    private readonly revalidation: RevalidationService,
  ) {}

  private normalizeBoolean(value?: string | boolean, defaultValue = false) {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;
    return ['true', '1', 'on'].includes(value.toLowerCase());
  }

  private mapAsesor(item: Asesor) {
    return {
      id: item.id,
      tipo: item.tipo,
      nombre: item.nombre,
      cargo: item.cargo,
      comunidad: item.comunidad,
      santoFavorito: item.santoFavorito,
      citaBiblica: item.citaBiblica,
      imageUrl: item.imageUrl,
      descripcion: item.descripcion,
      email: item.email,
      telefono: item.telefono,
      fechaInicio: item.fechaInicio,
      fechaFin: item.fechaFin,
      active: item.active,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private async deactivateOthersOfType(tipo: TipoAsesor, exceptId?: string) {
    const qb = this.repository
      .createQueryBuilder()
      .update(Asesor)
      .set({ active: false })
      .where('tipo = :tipo', { tipo })
      .andWhere('active = true');

    if (exceptId) {
      qb.andWhere('id != :id', { id: exceptId });
    }

    await qb.execute();
  }

  async create(dto: CreateAsesorDto, image?: Express.Multer.File) {
    try {
      const shouldActivate = this.normalizeBoolean(dto.active, true);

      if (shouldActivate) {
        await this.deactivateOthersOfType(dto.tipo);
      }

      const imageUrl = image
        ? await uploadSingleImage(image, 'jmv_ecuador/asesores')
        : null;

      const asesor = this.repository.create({
        tipo: dto.tipo,
        nombre: dto.nombre,
        cargo: dto.cargo,
        comunidad: dto.comunidad,
        santoFavorito: dto.santoFavorito,
        citaBiblica: dto.citaBiblica,
        descripcion: dto.descripcion,
        email: dto.email,
        telefono: dto.telefono,
        fechaInicio: dto.fechaInicio,
        fechaFin: dto.fechaFin,
        imageUrl: imageUrl ?? undefined,
        active: shouldActivate,
      });

      const saved = await this.repository.save(asesor);
      void this.revalidation.revalidate(ASESOR_TAGS);
      return this.mapAsesor(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll() {
    const items = await this.repository.find({
      order: { tipo: 'ASC', fechaInicio: 'DESC' },
    });
    return items.map((i) => this.mapAsesor(i));
  }

  async findActuales() {
    const items = await this.repository.find({
      where: { active: true },
      order: { tipo: 'ASC' },
    });
    return items.map((i) => this.mapAsesor(i));
  }

  async findOne(id: string) {
    const asesor = await this.repository.findOne({ where: { id } });
    if (!asesor) {
      throw new NotFoundException('Asesor no encontrado');
    }
    return this.mapAsesor(asesor);
  }

  async update(
    id: string,
    dto: UpdateAsesorDto,
    image?: Express.Multer.File,
  ) {
    try {
      const asesor = await this.repository.findOne({ where: { id } });
      if (!asesor) {
        throw new NotFoundException('Asesor no encontrado');
      }

      const targetTipo = dto.tipo ?? asesor.tipo;

      if (dto.active !== undefined) {
        const shouldActivate = this.normalizeBoolean(dto.active, asesor.active);
        if (shouldActivate && !asesor.active) {
          await this.deactivateOthersOfType(targetTipo, asesor.id);
        }
        asesor.active = shouldActivate;
      } else if (dto.tipo && dto.tipo !== asesor.tipo && asesor.active) {
        await this.deactivateOthersOfType(targetTipo, asesor.id);
      }

      if (image) {
        asesor.imageUrl =
          (await uploadSingleImage(image, 'jmv_ecuador/asesores')) ??
          asesor.imageUrl;
      }

      asesor.tipo = targetTipo;
      asesor.nombre = dto.nombre ?? asesor.nombre;
      asesor.cargo = dto.cargo ?? asesor.cargo;
      asesor.comunidad = dto.comunidad ?? asesor.comunidad;
      asesor.santoFavorito = dto.santoFavorito ?? asesor.santoFavorito;
      asesor.citaBiblica = dto.citaBiblica ?? asesor.citaBiblica;
      asesor.descripcion = dto.descripcion ?? asesor.descripcion;
      asesor.email = dto.email ?? asesor.email;
      asesor.telefono = dto.telefono ?? asesor.telefono;
      asesor.fechaInicio = dto.fechaInicio ?? asesor.fechaInicio;
      asesor.fechaFin = dto.fechaFin ?? asesor.fechaFin;

      const saved = await this.repository.save(asesor);
      void this.revalidation.revalidate(ASESOR_TAGS);
      return this.mapAsesor(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const asesor = await this.repository.findOne({ where: { id } });
      if (!asesor) {
        throw new NotFoundException('Asesor no encontrado');
      }
      await this.repository.remove(asesor);
      void this.revalidation.revalidate(ASESOR_TAGS);
      return { message: 'Asesor eliminado correctamente' };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: unknown): never {
    this.logger.error(error);
    if (error instanceof NotFoundException) {
      throw error;
    }
    throw new InternalServerErrorException('Error al gestionar asesores');
  }
}
