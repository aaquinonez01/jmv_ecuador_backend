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
import { DataSource, EntityManager, Repository } from 'typeorm';
import { RevalidationService } from '../common/revalidation/revalidation.service';
import { CreateStatuteVersionDto } from './dto/create-statute-version.dto';
import { UpdateStatuteVersionDto } from './dto/update-statute-version.dto';
import { StatuteVersion } from './entities/statute-version.entity';
import { STATUTES_SEED } from './seed/statutes.seed';

const STATUTES_TAGS = ['statutes'];
const STATUTES_PATHS = ['/quienes-somos/estatutos', '/quienes-somos'];

const OPTIONAL_TEXT_FIELDS = ['summary', 'pdfUrl'] as const;

@Injectable()
export class StatutesService implements OnApplicationBootstrap {
  private readonly logger = new Logger('StatutesService');

  constructor(
    @InjectRepository(StatuteVersion)
    private readonly repository: Repository<StatuteVersion>,
    private readonly dataSource: DataSource,
    private readonly revalidation: RevalidationService,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'production') return;
    if (STATUTES_SEED.length === 0) return;
    try {
      if ((await this.repository.count()) > 0) return;
      // Solo la primera marcada como vigente lo queda (índice único parcial)
      let currentTaken = false;
      await this.repository.save(
        STATUTES_SEED.map((item) => {
          const isCurrent = !currentTaken && item.isCurrent === true;
          if (isCurrent) currentTaken = true;
          return this.repository.create({
            ...item,
            summary: item.summary ?? null,
            pdfUrl: item.pdfUrl ?? null,
            isCurrent,
            published: isCurrent ? true : (item.published ?? true),
          });
        }),
      );
      this.logger.log(
        `Semilla de los estatutos: ${STATUTES_SEED.length} versiones`,
      );
    } catch (error) {
      // Nunca impedir el arranque
      this.logger.error(
        `No se pudo cargar la semilla de los estatutos: ${(error as Error).message}`,
      );
    }
  }

  private mapVersion(item: StatuteVersion) {
    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      versionLabel: item.versionLabel,
      approvedAt: item.approvedAt,
      approvedBy: item.approvedBy,
      summary: item.summary ?? null,
      content: item.content,
      pdfUrl: item.pdfUrl ?? null,
      isCurrent: item.isCurrent,
      published: item.published,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private mapListItem(item: StatuteVersion) {
    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      versionLabel: item.versionLabel,
      approvedAt: item.approvedAt,
      approvedBy: item.approvedBy,
      isCurrent: item.isCurrent,
      pdfUrl: item.pdfUrl ?? null,
    };
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
    return slug || 'estatutos';
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
      throw new ConflictException(
        `Ya existe una versión de los estatutos con el slug "${slug}"`,
      );
    }
  }

  private revalidate() {
    void this.revalidation.revalidate(STATUTES_TAGS, STATUTES_PATHS);
  }

  // Desmarca la vigente anterior y marca esta, dentro de la misma transacción.
  // La vigente siempre queda publicada.
  private async setCurrent(manager: EntityManager, id: string) {
    await manager
      .createQueryBuilder()
      .update(StatuteVersion)
      .set({ isCurrent: false })
      .where('"isCurrent" = true AND "id" <> :id', { id })
      .execute();
    await manager.update(
      StatuteVersion,
      { id },
      {
        isCurrent: true,
        published: true,
      },
    );
  }

  async create(dto: CreateStatuteVersionDto) {
    try {
      let slug: string;
      if (dto.slug) {
        await this.assertSlugAvailable(dto.slug);
        slug = dto.slug;
      } else {
        slug = await this.uniqueSlug(
          this.slugify(`${dto.title} ${dto.versionLabel}`),
        );
      }

      const saved = await this.dataSource.transaction(async (manager) => {
        const item = await manager.save(
          manager.create(StatuteVersion, {
            slug,
            title: dto.title,
            versionLabel: dto.versionLabel,
            approvedAt: dto.approvedAt,
            approvedBy: dto.approvedBy,
            summary: dto.summary ?? null,
            content: dto.content,
            pdfUrl: dto.pdfUrl ?? null,
            isCurrent: false,
            published: dto.published ?? true,
          }),
        );
        if (dto.isCurrent) await this.setCurrent(manager, item.id);
        return manager.findOneOrFail(StatuteVersion, {
          where: { id: item.id },
        });
      });

      this.revalidate();
      return this.mapVersion(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll() {
    try {
      const items = await this.repository.find({
        order: { approvedAt: 'DESC', createdAt: 'DESC' },
      });
      return { items: items.map((item) => this.mapVersion(item)) };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findPublic() {
    try {
      const items = await this.repository.find({
        where: { published: true },
        select: {
          id: true,
          slug: true,
          title: true,
          versionLabel: true,
          approvedAt: true,
          approvedBy: true,
          isCurrent: true,
          pdfUrl: true,
        },
        order: { approvedAt: 'DESC', createdAt: 'DESC' },
      });
      return { items: items.map((item) => this.mapListItem(item)) };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findCurrent() {
    const item = await this.repository.findOne({
      where: { isCurrent: true, published: true },
    });
    if (!item) {
      throw new NotFoundException('No hay estatutos vigentes publicados');
    }
    return this.mapVersion(item);
  }

  async findPublicBySlug(slug: string) {
    const item = await this.repository.findOne({
      where: { slug, published: true },
    });
    if (!item)
      throw new NotFoundException('Versión de los estatutos no encontrada');
    return this.mapVersion(item);
  }

  async findOne(id: string) {
    const item = await this.repository.findOne({ where: { id } });
    if (!item)
      throw new NotFoundException('Versión de los estatutos no encontrada');
    return this.mapVersion(item);
  }

  async update(id: string, dto: UpdateStatuteVersionDto) {
    try {
      const item = await this.repository.findOne({ where: { id } });
      if (!item) {
        throw new NotFoundException('Versión de los estatutos no encontrada');
      }

      if (item.isCurrent && dto.isCurrent === false) {
        throw new BadRequestException(
          'Para cambiar la versión vigente, marca otra versión como vigente',
        );
      }
      if (item.isCurrent && dto.published === false) {
        throw new BadRequestException(
          'La versión vigente no se puede ocultar. Marca otra como vigente primero',
        );
      }

      if (dto.slug && dto.slug !== item.slug) {
        await this.assertSlugAvailable(dto.slug, item.id);
        item.slug = dto.slug;
      }
      if (dto.title) item.title = dto.title;
      if (dto.versionLabel) item.versionLabel = dto.versionLabel;
      if (dto.approvedAt) item.approvedAt = dto.approvedAt;
      if (dto.approvedBy) item.approvedBy = dto.approvedBy;
      if (dto.content) item.content = dto.content;
      for (const field of OPTIONAL_TEXT_FIELDS) {
        if (dto[field] !== undefined) item[field] = dto[field];
      }
      if (dto.published !== undefined) item.published = dto.published;

      const saved = await this.dataSource.transaction(async (manager) => {
        await manager.save(item);
        if (dto.isCurrent && !item.isCurrent) {
          await this.setCurrent(manager, item.id);
        }
        return manager.findOneOrFail(StatuteVersion, { where: { id } });
      });

      this.revalidate();
      return this.mapVersion(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async makeCurrent(id: string) {
    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        const item = await manager.findOne(StatuteVersion, { where: { id } });
        if (!item) {
          throw new NotFoundException('Versión de los estatutos no encontrada');
        }
        await this.setCurrent(manager, id);
        return manager.findOneOrFail(StatuteVersion, { where: { id } });
      });
      this.revalidate();
      return this.mapVersion(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const item = await this.repository.findOne({ where: { id } });
      if (!item) {
        throw new NotFoundException('Versión de los estatutos no encontrada');
      }
      if (item.isCurrent) {
        throw new BadRequestException(
          'No puedes eliminar la versión vigente. Marca otra como vigente primero',
        );
      }
      await this.repository.remove(item);
      this.revalidate();
      return { message: 'Versión de los estatutos eliminada correctamente' };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: unknown): never {
    if (error instanceof HttpException) throw error;
    if ((error as { code?: string })?.code === '23505') {
      throw new ConflictException(
        'Ya existe una versión con ese slug o ya hay otra versión vigente',
      );
    }
    this.logger.error(error);
    throw new InternalServerErrorException('Error al gestionar los estatutos');
  }
}
