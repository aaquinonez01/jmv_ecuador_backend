import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateScopeDto } from './dto/create-scope.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scope } from './entities/scope.entity';
import { ActivityType } from './entities/activity-type.entity';
import { Subtype } from './entities/subtype.entity';
import { Logger } from '@nestjs/common';
import { UpdateScopeDto } from './dto/update-scope.dto';
import { CreateActivityTypeDto } from './dto/activity-type.entity.dto';
import { CreateSubtypeDto } from './dto/create-sub-type.dto';
import { UpdateActivityTypeDto } from './dto/update-activity-type.dto';
import { UpdateSubtypeDto } from './dto/update-sub-type.dto';
@Injectable()
export class CategoryPostService {
  private readonly logger = new Logger('CategoryPostService');
  constructor(
    @InjectRepository(Scope)
    private readonly scopeRepository: Repository<Scope>,
    @InjectRepository(ActivityType)
    private readonly activityTypeRepository: Repository<ActivityType>,
    @InjectRepository(Subtype)
    private readonly subtypeRepository: Repository<Subtype>,
  ) {}
  async createScope(createScopeDto: CreateScopeDto) {
    try {
      const slug =
        createScopeDto.slug || this.generateSlug(createScopeDto.name);
      const scope = this.scopeRepository.create({
        ...createScopeDto,
        slug,
      });
      await this.scopeRepository.save(scope);
      return scope;
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAllScopes() {
    try {
      const scopes = await this.scopeRepository.find({
        order: { order: 'ASC' },
      });

      return scopes;
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async createActivityType(createActivityTypeDto: CreateActivityTypeDto) {
    try {
      const slug =
        createActivityTypeDto.slug ||
        this.generateSlug(createActivityTypeDto.name);
      const activityType = this.activityTypeRepository.create({
        ...createActivityTypeDto,
        slug,
      });
      await this.activityTypeRepository.save(activityType);
      return activityType;
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAllActivityTypes() {
    try {
      const activityTypes = await this.activityTypeRepository.find({
        order: { order: 'ASC' },
      });
      return activityTypes;
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findOneActivityType(id: string) {
    try {
      const activityType = await this.activityTypeRepository.findOne({
        where: { id },
      });
      if (!activityType) {
        throw new NotFoundException(
          `No se encontro el tipo de actividad especificado`,
        );
      }
      return activityType;
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async updateActivityType(
    id: string,
    updateActivityTypeDto: UpdateActivityTypeDto,
  ) {
    try {
      const activityType = await this.activityTypeRepository.preload({
        id,
        ...updateActivityTypeDto,
      });
      if (!activityType) {
        throw new NotFoundException(
          `No se encontro el tipo de actividad especificado`,
        );
      }
      return this.activityTypeRepository.save(activityType);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async updateSubtype(id: string, updateSubtypeDto: UpdateSubtypeDto) {
    try {
      const subtype = await this.subtypeRepository.preload({
        id,
        ...updateSubtypeDto,
      });
      if (!subtype) {
        throw new NotFoundException(`No se encontro el subtipo especificado`);
      }
      return this.subtypeRepository.save(subtype);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async removeSubtype(id: string) {
    try {
      const subtype = await this.subtypeRepository.findOne({ where: { id } });
      if (!subtype) {
        throw new NotFoundException(`No se encontro el subtipo especificado`);
      }
      await this.subtypeRepository.remove(subtype);
      return subtype;
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async removeActivityType(id: string) {
    try {
      const activityType = await this.activityTypeRepository.findOne({
        where: { id },
      });
      if (!activityType) {
        throw new NotFoundException(
          `No se encontro el tipo de actividad especificado`,
        );
      }
      await this.activityTypeRepository.remove(activityType);
      return activityType;
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async createSubtype(createSubtypeDto: CreateSubtypeDto) {
    try {
      const activityType = await this.activityTypeRepository.findOne({
        where: { id: createSubtypeDto.activityTypeId },
        relations: ['subtypes'],
      });
      if (!activityType) {
        throw new NotFoundException(
          `No se encontro el tipo de actividad especificado`,
        );
      }
      const slug =
        createSubtypeDto.slug || this.generateSlug(createSubtypeDto.name);
      const subtype = this.subtypeRepository.create({
        ...createSubtypeDto,
        slug,
      });
      subtype.activityType = activityType;
      await this.subtypeRepository.save(subtype);
      return subtype;
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAllSubtypes() {
    try {
      const subtypes = await this.subtypeRepository.find({
        relations: ['activityType'],
        order: { order: 'ASC' },
      });
      return subtypes;
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAllSubtypesByActivityType(activityTypeId: string) {
    try {
      const subtypes = await this.subtypeRepository.find({
        where: { activityType: { id: activityTypeId } },
      });
      return subtypes;
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findOneSubtype(id: string) {
    try {
      const subtype = await this.subtypeRepository.findOne({ where: { id } });
      if (!subtype) {
        throw new NotFoundException(`No se encontro el subtipo especificado`);
      }
      return subtype;
    } catch (error) {
      this.handleExceptions(error);
    }
  }
  async findOneScope(id: string) {
    try {
      const scope = await this.scopeRepository.findOne({ where: { id } });
      if (!scope) {
        throw new NotFoundException(`No se encontro el alcance especificado`);
      }
      return scope;
    } catch (error) {
      this.handleExceptions(error);
    }
  }
  async updateScope(id: string, updateScopeDto: UpdateScopeDto) {
    try {
      const scope = await this.scopeRepository.preload({
        id,
        ...updateScopeDto,
      });
      if (!scope) {
        throw new NotFoundException(`Scope with id ${id} not found`);
      }
      return this.scopeRepository.save(scope);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async removeScope(id: string) {
    try {
      const scope = await this.scopeRepository.findOne({ where: { id } });
      if (!scope) {
        throw new NotFoundException(`No se encontro el alcance especificado`);
      }
      await this.scopeRepository.remove(scope);
      return scope;
    } catch (error) {
      this.handleExceptions(error);
    }
  }
  async findAllCategories() {
    try {
      const scopes = await this.scopeRepository.find({
        order: { order: 'ASC' },
      });
      const activityTypes = await this.activityTypeRepository.find({
        order: { order: 'ASC' },
      });

      return {
        scopes,
        activityTypes,
      };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private handleExceptions(error: unknown) {
    this.logger.error(error);

    // Verificar si es un error de constraint unique
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === '23505'
    ) {
      throw new ConflictException('Ya existe un registro con ese valor único');
    }

    throw new InternalServerErrorException('Error al realizar la operación');
  }
}
