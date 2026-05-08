import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { uploadSingleImage } from 'src/helpers/file-upload.helper';
import { ConsejoPeriod } from './entities/consejo-period.entity';
import {
  ConsejoMember,
  TipoCargoConsejo,
} from './entities/consejo-member.entity';
import { CreateConsejoPeriodDto } from './dto/create-consejo-period.dto';
import { UpdateConsejoPeriodDto } from './dto/update-consejo-period.dto';
import { CreateConsejoMemberDto } from './dto/create-consejo-member.dto';
import { UpdateConsejoMemberDto } from './dto/update-consejo-member.dto';
import { RevalidationService } from '../common/revalidation/revalidation.service';

const CARGOS_UNICOS: TipoCargoConsejo[] = [
  TipoCargoConsejo.COORDINADOR,
  TipoCargoConsejo.VICECOORDINADOR,
  TipoCargoConsejo.SECRETARIO,
  TipoCargoConsejo.TESORERO,
];

const CONSEJO_TAGS = ['consejo_actual'];

@Injectable()
export class ConsejoNacionalService {
  private readonly logger = new Logger('ConsejoNacionalService');

  constructor(
    @InjectRepository(ConsejoPeriod)
    private readonly periodRepository: Repository<ConsejoPeriod>,
    @InjectRepository(ConsejoMember)
    private readonly memberRepository: Repository<ConsejoMember>,
    private readonly revalidation: RevalidationService,
  ) {}

  private normalizeBoolean(value?: string | boolean, defaultValue = false) {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;
    return ['true', '1', 'on'].includes(value.toLowerCase());
  }

  private normalizeNumber(value?: string | number | null, defaultValue = 0) {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'number') return value;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }

  private mapMember(item: ConsejoMember) {
    return {
      id: item.id,
      nombre: item.nombre,
      cargo: item.cargo,
      tipoCargo: item.tipoCargo,
      edad: item.edad,
      comunidad: item.comunidad,
      santoFavorito: item.santoFavorito,
      citaBiblica: item.citaBiblica,
      imageUrl: item.imageUrl,
      descripcion: item.descripcion,
      email: item.email,
      telefono: item.telefono,
      fechaPosesion: item.fechaPosesion,
      fechaFinCargo: item.fechaFinCargo,
      displayOrder: item.displayOrder,
      active: item.active,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private mapPeriod(item: ConsejoPeriod) {
    return {
      id: item.id,
      nombre: item.nombre,
      fechaInicio: item.fechaInicio,
      fechaFin: item.fechaFin,
      descripcion: item.descripcion,
      active: item.active,
      miembros: (item.miembros || [])
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((m) => this.mapMember(m)),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async createPeriod(dto: CreateConsejoPeriodDto) {
    try {
      const shouldActivate = this.normalizeBoolean(dto.active, false);

      if (shouldActivate) {
        await this.periodRepository.update({ active: true }, { active: false });
      }

      const period = this.periodRepository.create({
        nombre: dto.nombre,
        fechaInicio: dto.fechaInicio,
        fechaFin: dto.fechaFin,
        descripcion: dto.descripcion,
        active: shouldActivate,
      });

      const saved = await this.periodRepository.save(period);
      void this.revalidation.revalidate(CONSEJO_TAGS);
      return this.mapPeriod({ ...saved, miembros: [] });
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAllPeriods() {
    const periods = await this.periodRepository.find({
      relations: ['miembros'],
      order: { fechaInicio: 'DESC' },
    });
    return periods.map((p) => this.mapPeriod(p));
  }

  async findActualPeriod() {
    const period = await this.periodRepository.findOne({
      where: { active: true },
      relations: ['miembros'],
    });
    if (!period) return null;
    return this.mapPeriod(period);
  }

  async findOnePeriod(id: string) {
    const period = await this.periodRepository.findOne({
      where: { id },
      relations: ['miembros'],
    });
    if (!period) {
      throw new NotFoundException('Período del Consejo no encontrado');
    }
    return this.mapPeriod(period);
  }

  async updatePeriod(id: string, dto: UpdateConsejoPeriodDto) {
    try {
      const period = await this.periodRepository.findOne({ where: { id } });
      if (!period) {
        throw new NotFoundException('Período del Consejo no encontrado');
      }

      if (dto.active !== undefined) {
        const shouldActivate = this.normalizeBoolean(dto.active, period.active);
        if (shouldActivate && !period.active) {
          await this.periodRepository.update(
            { active: true },
            { active: false },
          );
        }
        period.active = shouldActivate;
      }

      period.nombre = dto.nombre ?? period.nombre;
      period.fechaInicio = dto.fechaInicio ?? period.fechaInicio;
      period.fechaFin = dto.fechaFin ?? period.fechaFin;
      period.descripcion = dto.descripcion ?? period.descripcion;

      const saved = await this.periodRepository.save(period);
      void this.revalidation.revalidate(CONSEJO_TAGS);
      return this.findOnePeriod(saved.id);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async removePeriod(id: string) {
    try {
      const period = await this.periodRepository.findOne({ where: { id } });
      if (!period) {
        throw new NotFoundException('Período del Consejo no encontrado');
      }
      await this.periodRepository.remove(period);
      void this.revalidation.revalidate(CONSEJO_TAGS);
      return { message: 'Período eliminado correctamente' };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async createMember(
    periodId: string,
    dto: CreateConsejoMemberDto,
    image?: Express.Multer.File,
  ) {
    try {
      const period = await this.periodRepository.findOne({
        where: { id: periodId },
        relations: ['miembros'],
      });
      if (!period) {
        throw new NotFoundException('Período del Consejo no encontrado');
      }

      if (CARGOS_UNICOS.includes(dto.tipoCargo)) {
        const existing = (period.miembros || []).find(
          (m) => m.tipoCargo === dto.tipoCargo,
        );
        if (existing) {
          throw new BadRequestException(
            `Ya existe un miembro con el cargo "${dto.tipoCargo}" en este período`,
          );
        }
      }

      const imageUrl = image
        ? await uploadSingleImage(image, 'jmv_ecuador/consejo')
        : null;

      const count = (period.miembros || []).length;

      const member = this.memberRepository.create({
        period,
        nombre: dto.nombre,
        cargo: dto.cargo,
        tipoCargo: dto.tipoCargo,
        edad:
          dto.edad !== undefined
            ? this.normalizeNumber(dto.edad, 0) || undefined
            : undefined,
        comunidad: dto.comunidad,
        santoFavorito: dto.santoFavorito,
        citaBiblica: dto.citaBiblica,
        descripcion: dto.descripcion,
        email: dto.email,
        telefono: dto.telefono,
        fechaPosesion: dto.fechaPosesion,
        fechaFinCargo: dto.fechaFinCargo,
        imageUrl: imageUrl ?? undefined,
        displayOrder: this.normalizeNumber(dto.displayOrder, count + 1),
        active: this.normalizeBoolean(dto.active, true),
      });

      const saved = await this.memberRepository.save(member);
      void this.revalidation.revalidate(CONSEJO_TAGS);
      return this.mapMember(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async updateMember(
    id: string,
    dto: UpdateConsejoMemberDto,
    image?: Express.Multer.File,
  ) {
    try {
      const member = await this.memberRepository.findOne({
        where: { id },
        relations: ['period', 'period.miembros'],
      });
      if (!member) {
        throw new NotFoundException('Miembro del Consejo no encontrado');
      }

      if (
        dto.tipoCargo &&
        dto.tipoCargo !== member.tipoCargo &&
        CARGOS_UNICOS.includes(dto.tipoCargo)
      ) {
        const conflict = (member.period.miembros || []).find(
          (m) => m.tipoCargo === dto.tipoCargo && m.id !== member.id,
        );
        if (conflict) {
          throw new BadRequestException(
            `Ya existe un miembro con el cargo "${dto.tipoCargo}" en este período`,
          );
        }
      }

      if (image) {
        member.imageUrl =
          (await uploadSingleImage(image, 'jmv_ecuador/consejo')) ??
          member.imageUrl;
      }

      member.nombre = dto.nombre ?? member.nombre;
      member.cargo = dto.cargo ?? member.cargo;
      member.tipoCargo = dto.tipoCargo ?? member.tipoCargo;
      if (dto.edad !== undefined) {
        member.edad = this.normalizeNumber(dto.edad, 0) || undefined;
      }
      member.comunidad = dto.comunidad ?? member.comunidad;
      member.santoFavorito = dto.santoFavorito ?? member.santoFavorito;
      member.citaBiblica = dto.citaBiblica ?? member.citaBiblica;
      member.descripcion = dto.descripcion ?? member.descripcion;
      member.email = dto.email ?? member.email;
      member.telefono = dto.telefono ?? member.telefono;
      member.fechaPosesion = dto.fechaPosesion ?? member.fechaPosesion;
      member.fechaFinCargo = dto.fechaFinCargo ?? member.fechaFinCargo;
      member.displayOrder =
        dto.displayOrder !== undefined
          ? this.normalizeNumber(dto.displayOrder, member.displayOrder)
          : member.displayOrder;
      member.active =
        dto.active !== undefined
          ? this.normalizeBoolean(dto.active, member.active)
          : member.active;

      const saved = await this.memberRepository.save(member);
      void this.revalidation.revalidate(CONSEJO_TAGS);
      return this.mapMember(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async removeMember(id: string) {
    try {
      const member = await this.memberRepository.findOne({ where: { id } });
      if (!member) {
        throw new NotFoundException('Miembro del Consejo no encontrado');
      }
      await this.memberRepository.remove(member);
      void this.revalidation.revalidate(CONSEJO_TAGS);
      return { message: 'Miembro eliminado correctamente' };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: unknown): never {
    this.logger.error(error);
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }
    throw new InternalServerErrorException(
      'Error al gestionar el Consejo Nacional',
    );
  }
}
