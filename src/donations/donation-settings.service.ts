import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RevalidationService } from '../common/revalidation/revalidation.service';
import { UpdateDonationSettingsDto } from './dto/update-donation-settings.dto';
import {
  mapSettings,
  removeDonationImage,
  revalidateDonations,
  uploadDonationImage,
} from './donations.shared';
import { DonationSettings } from './entities/donation-settings.entity';

const SETTINGS_ID = 1;

// Textos neutros de arranque (sin datos bancarios: los pone el tesorero)
export const DEFAULT_DONATION_SETTINGS = {
  headline: 'Apoya la misión de JMV Ecuador',
  intro:
    'Tu aporte ayuda a que más jóvenes vivan la fe, se formen y sirvan a los más pobres al estilo de María y de San Vicente de Paúl.',
  contactNote: '¿Tienes dudas sobre tu donación? Escríbenos y te ayudamos.',
  email: 'jmvecuador@gmail.com',
};

const OPTIONAL_FIELDS = [
  'whatsapp',
  'email',
  'paypalUrl',
  'qrLabel',
  'inKindNote',
  'transparencyNote',
] as const;

@Injectable()
export class DonationSettingsService {
  private readonly logger = new Logger('DonationSettingsService');

  constructor(
    @InjectRepository(DonationSettings)
    private readonly repository: Repository<DonationSettings>,
    private readonly revalidation: RevalidationService,
  ) {}

  // Devuelve la fila única y la crea con los textos por defecto si no existe
  async getOrCreate() {
    const existing = await this.repository.findOne({
      where: { id: SETTINGS_ID },
    });
    if (existing) return existing;
    await this.repository
      .createQueryBuilder()
      .insert()
      .into(DonationSettings)
      .values({ id: SETTINGS_ID, ...DEFAULT_DONATION_SETTINGS })
      .orIgnore()
      .execute();
    return this.repository.findOneOrFail({ where: { id: SETTINGS_ID } });
  }

  async find() {
    try {
      return mapSettings(await this.getOrCreate());
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async update(dto: UpdateDonationSettingsDto, qrImage?: Express.Multer.File) {
    let uploadedId: string | null = null;
    try {
      const item = await this.getOrCreate();

      // Primero se sube el QR nuevo; el anterior se borra tras guardar
      let staleImageId: string | null = null;
      if (qrImage) {
        const uploaded = await uploadDonationImage(qrImage);
        uploadedId = uploaded.publicId;
        staleImageId = item.qrImagePublicId ?? null;
        item.qrImageUrl = uploaded.url;
        item.qrImagePublicId = uploaded.publicId;
      } else if (dto.removeQr) {
        staleImageId = item.qrImagePublicId ?? null;
        item.qrImageUrl = null;
        item.qrImagePublicId = null;
      } else if (
        dto.qrImageUrl !== undefined &&
        dto.qrImageUrl !== item.qrImageUrl
      ) {
        staleImageId = item.qrImagePublicId ?? null;
        item.qrImageUrl = dto.qrImageUrl;
        item.qrImagePublicId = null;
      }

      if (dto.headline) item.headline = dto.headline;
      if (dto.intro) item.intro = dto.intro;
      if (dto.contactNote) item.contactNote = dto.contactNote;
      for (const field of OPTIONAL_FIELDS) {
        if (dto[field] !== undefined) item[field] = dto[field];
      }

      const saved = await this.repository.save(item);
      if (staleImageId) await removeDonationImage(this.logger, staleImageId);
      revalidateDonations(this.revalidation);
      return mapSettings(saved);
    } catch (error) {
      if (uploadedId) await removeDonationImage(this.logger, uploadedId);
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: unknown): never {
    if (error instanceof HttpException) throw error;
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Error al gestionar la configuración de donaciones',
    );
  }
}
