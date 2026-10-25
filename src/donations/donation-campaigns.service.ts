import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RevalidationService } from '../common/revalidation/revalidation.service';
import { todayInGuayaquil } from '../common/validators/is-iso-day';
import { CreateDonationCampaignDto } from './dto/create-donation-campaign.dto';
import { UpdateDonationCampaignDto } from './dto/update-donation-campaign.dto';
import {
  isCheckViolation,
  mapCampaign,
  removeDonationImage,
  revalidateDonations,
  slugify,
  uploadDonationImage,
} from './donations.shared';
import { DonationCampaign } from './entities/donation-campaign.entity';

@Injectable()
export class DonationCampaignsService {
  private readonly logger = new Logger('DonationCampaignsService');

  constructor(
    @InjectRepository(DonationCampaign)
    private readonly repository: Repository<DonationCampaign>,
    private readonly revalidation: RevalidationService,
  ) {}

  private assertValidRange(startsAt?: string | null, endsAt?: string | null) {
    if (startsAt && endsAt && endsAt < startsAt) {
      throw new BadRequestException(
        'La fecha de cierre no puede ser anterior a la de inicio',
      );
    }
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
        `Ya existe una campaña con el slug "${slug}"`,
      );
    }
  }

  async create(dto: CreateDonationCampaignDto, image?: Express.Multer.File) {
    // Si el guardado falla, la imagen recién subida no debe quedar huérfana
    let uploadedId: string | null = null;
    try {
      this.assertValidRange(dto.startsAt, dto.endsAt);

      let slug: string;
      if (dto.slug) {
        await this.assertSlugAvailable(dto.slug);
        slug = dto.slug;
      } else {
        slug = await this.uniqueSlug(slugify(dto.title));
      }

      const uploaded = image ? await uploadDonationImage(image) : null;
      uploadedId = uploaded?.publicId ?? null;

      const saved = await this.repository.save(
        this.repository.create({
          slug,
          title: dto.title,
          description: dto.description,
          goalAmount: dto.goalAmount ?? null,
          raisedAmount: dto.raisedAmount ?? null,
          currency: dto.currency ?? 'USD',
          imageUrl: uploaded?.url ?? dto.imageUrl ?? null,
          imagePublicId: uploaded?.publicId ?? null,
          startsAt: dto.startsAt ?? null,
          endsAt: dto.endsAt ?? null,
          active: dto.active ?? true,
          displayOrder: dto.displayOrder ?? 0,
        }),
      );
      revalidateDonations(this.revalidation);
      return mapCampaign(saved);
    } catch (error) {
      if (uploadedId) await removeDonationImage(this.logger, uploadedId);
      this.handleExceptions(error);
    }
  }

  async findAll() {
    try {
      const items = await this.repository.find({
        order: { displayOrder: 'ASC', createdAt: 'DESC' },
      });
      return { items: items.map(mapCampaign) };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  // Activas y vigentes hoy (hora de Ecuador); sin fechas = siempre vigente
  async findActive() {
    const today = todayInGuayaquil();
    const items = await this.repository
      .createQueryBuilder('campaign')
      .where('campaign.active = true')
      .andWhere('(campaign.startsAt IS NULL OR campaign.startsAt <= :today)', {
        today,
      })
      .andWhere('(campaign.endsAt IS NULL OR campaign.endsAt >= :today)', {
        today,
      })
      .orderBy('campaign.displayOrder', 'ASC')
      .addOrderBy('campaign.createdAt', 'DESC')
      .getMany();
    return items.map(mapCampaign);
  }

  async findOne(id: string) {
    const item = await this.repository.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Campaña no encontrada');
    return mapCampaign(item);
  }

  async update(
    id: string,
    dto: UpdateDonationCampaignDto,
    image?: Express.Multer.File,
  ) {
    let uploadedId: string | null = null;
    try {
      const item = await this.repository.findOne({ where: { id } });
      if (!item) throw new NotFoundException('Campaña no encontrada');

      const startsAt =
        dto.startsAt !== undefined ? dto.startsAt : (item.startsAt ?? null);
      const endsAt =
        dto.endsAt !== undefined ? dto.endsAt : (item.endsAt ?? null);
      this.assertValidRange(startsAt, endsAt);

      if (dto.slug && dto.slug !== item.slug) {
        await this.assertSlugAvailable(dto.slug, item.id);
        item.slug = dto.slug;
      }

      // Primero se sube la imagen nueva; la anterior se borra tras guardar
      let staleImageId: string | null = null;
      if (image) {
        const uploaded = await uploadDonationImage(image);
        uploadedId = uploaded.publicId;
        staleImageId = item.imagePublicId ?? null;
        item.imageUrl = uploaded.url;
        item.imagePublicId = uploaded.publicId;
      } else if (dto.removeImage) {
        staleImageId = item.imagePublicId ?? null;
        item.imageUrl = null;
        item.imagePublicId = null;
      } else if (dto.imageUrl !== undefined && dto.imageUrl !== item.imageUrl) {
        staleImageId = item.imagePublicId ?? null;
        item.imageUrl = dto.imageUrl;
        item.imagePublicId = null;
      }

      item.startsAt = startsAt;
      item.endsAt = endsAt;
      if (dto.title) item.title = dto.title;
      if (dto.description) item.description = dto.description;
      if (dto.goalAmount !== undefined) item.goalAmount = dto.goalAmount;
      if (dto.raisedAmount !== undefined) item.raisedAmount = dto.raisedAmount;
      if (dto.currency) item.currency = dto.currency;
      if (dto.active !== undefined) item.active = dto.active;
      if (dto.displayOrder !== undefined && dto.displayOrder !== null) {
        item.displayOrder = dto.displayOrder;
      }

      const saved = await this.repository.save(item);
      if (staleImageId) await removeDonationImage(this.logger, staleImageId);
      revalidateDonations(this.revalidation);
      return mapCampaign(saved);
    } catch (error) {
      if (uploadedId) await removeDonationImage(this.logger, uploadedId);
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const item = await this.repository.findOne({ where: { id } });
      if (!item) throw new NotFoundException('Campaña no encontrada');
      const { imagePublicId } = item;
      await this.repository.remove(item);
      await removeDonationImage(this.logger, imagePublicId);
      revalidateDonations(this.revalidation);
      return { message: 'Campaña eliminada correctamente' };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: unknown): never {
    if (error instanceof HttpException) throw error;
    if ((error as { code?: string })?.code === '23505') {
      throw new ConflictException('Ya existe una campaña con ese slug');
    }
    if (isCheckViolation(error)) {
      throw new BadRequestException(
        'Revisa los montos (no negativos) y las fechas de la campaña',
      );
    }
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Error al gestionar las campañas de donación',
    );
  }
}
