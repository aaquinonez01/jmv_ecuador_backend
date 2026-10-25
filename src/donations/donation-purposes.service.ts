import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RevalidationService } from '../common/revalidation/revalidation.service';
import { CreateDonationPurposeDto } from './dto/create-donation-purpose.dto';
import { UpdateDonationPurposeDto } from './dto/update-donation-purpose.dto';
import {
  isCheckViolation,
  mapPurpose,
  removeDonationImage,
  revalidateDonations,
  uploadDonationImage,
} from './donations.shared';
import { DonationPurpose } from './entities/donation-purpose.entity';

@Injectable()
export class DonationPurposesService {
  private readonly logger = new Logger('DonationPurposesService');

  constructor(
    @InjectRepository(DonationPurpose)
    private readonly repository: Repository<DonationPurpose>,
    private readonly revalidation: RevalidationService,
  ) {}

  async create(dto: CreateDonationPurposeDto, image?: Express.Multer.File) {
    // Si el guardado falla, la imagen recién subida no debe quedar huérfana
    let uploadedId: string | null = null;
    try {
      const uploaded = image ? await uploadDonationImage(image) : null;
      uploadedId = uploaded?.publicId ?? null;

      const saved = await this.repository.save(
        this.repository.create({
          title: dto.title,
          description: dto.description,
          icon: dto.icon ?? 'Heart',
          imageUrl: uploaded?.url ?? dto.imageUrl ?? null,
          imagePublicId: uploaded?.publicId ?? null,
          active: dto.active ?? true,
          displayOrder: dto.displayOrder ?? 0,
        }),
      );
      revalidateDonations(this.revalidation);
      return mapPurpose(saved);
    } catch (error) {
      if (uploadedId) await removeDonationImage(this.logger, uploadedId);
      this.handleExceptions(error);
    }
  }

  async findAll() {
    try {
      const items = await this.repository.find({
        order: { displayOrder: 'ASC', createdAt: 'ASC' },
      });
      return { items: items.map(mapPurpose) };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findActive() {
    const items = await this.repository.find({
      where: { active: true },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
    return items.map(mapPurpose);
  }

  async findOne(id: string) {
    const item = await this.repository.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Destino no encontrado');
    return mapPurpose(item);
  }

  async update(
    id: string,
    dto: UpdateDonationPurposeDto,
    image?: Express.Multer.File,
  ) {
    let uploadedId: string | null = null;
    try {
      const item = await this.repository.findOne({ where: { id } });
      if (!item) throw new NotFoundException('Destino no encontrado');

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

      if (dto.title) item.title = dto.title;
      if (dto.description) item.description = dto.description;
      if (dto.icon) item.icon = dto.icon;
      if (dto.active !== undefined) item.active = dto.active;
      if (dto.displayOrder !== undefined && dto.displayOrder !== null) {
        item.displayOrder = dto.displayOrder;
      }

      const saved = await this.repository.save(item);
      if (staleImageId) await removeDonationImage(this.logger, staleImageId);
      revalidateDonations(this.revalidation);
      return mapPurpose(saved);
    } catch (error) {
      if (uploadedId) await removeDonationImage(this.logger, uploadedId);
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const item = await this.repository.findOne({ where: { id } });
      if (!item) throw new NotFoundException('Destino no encontrado');
      const { imagePublicId } = item;
      await this.repository.remove(item);
      await removeDonationImage(this.logger, imagePublicId);
      revalidateDonations(this.revalidation);
      return { message: 'Destino eliminado correctamente' };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: unknown): never {
    if (error instanceof HttpException) throw error;
    if (isCheckViolation(error)) {
      throw new BadRequestException('Revisa el icono elegido');
    }
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Error al gestionar los destinos de las donaciones',
    );
  }
}
