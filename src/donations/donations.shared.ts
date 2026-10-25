import { Logger } from '@nestjs/common';
import {
  deleteImageByPublicId,
  uploadImageWithPublicId,
} from 'src/helpers/file-upload.helper';
import { RevalidationService } from '../common/revalidation/revalidation.service';
import { DonationAccount } from './entities/donation-account.entity';
import { DonationCampaign } from './entities/donation-campaign.entity';
import { DonationPurpose } from './entities/donation-purpose.entity';
import { DonationSettings } from './entities/donation-settings.entity';

export const DONATIONS_FOLDER = 'jmv_ecuador/donations';
const DONATIONS_TAGS = ['donations'];
const DONATIONS_PATHS = ['/donar', '/'];

export function revalidateDonations(revalidation: RevalidationService) {
  void revalidation.revalidate(DONATIONS_TAGS, DONATIONS_PATHS);
}

export function uploadDonationImage(file: Express.Multer.File) {
  return uploadImageWithPublicId(file, DONATIONS_FOLDER);
}

export async function removeDonationImage(
  logger: Logger,
  publicId?: string | null,
) {
  try {
    await deleteImageByPublicId(publicId);
  } catch (error) {
    logger.warn(
      `No se pudo borrar la imagen ${publicId} de Cloudinary: ${(error as Error).message}`,
    );
  }
}

export function slugify(text: string) {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 110)
    .replace(/-+$/g, '');
  return slug || 'campana';
}

export function mapSettings(item: DonationSettings) {
  return {
    headline: item.headline,
    intro: item.intro,
    contactNote: item.contactNote,
    whatsapp: item.whatsapp ?? null,
    email: item.email ?? null,
    paypalUrl: item.paypalUrl ?? null,
    qrImageUrl: item.qrImageUrl ?? null,
    qrLabel: item.qrLabel ?? null,
    inKindNote: item.inKindNote ?? null,
    transparencyNote: item.transparencyNote ?? null,
    updatedAt: item.updatedAt,
  };
}

export function mapAccount(item: DonationAccount) {
  return {
    id: item.id,
    bankName: item.bankName,
    accountType: item.accountType,
    accountNumber: item.accountNumber,
    holderName: item.holderName,
    holderId: item.holderId ?? null,
    holderRole: item.holderRole ?? null,
    email: item.email ?? null,
    notes: item.notes ?? null,
    active: item.active,
    displayOrder: item.displayOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function mapPurpose(item: DonationPurpose) {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    icon: item.icon,
    imageUrl: item.imageUrl ?? null,
    active: item.active,
    displayOrder: item.displayOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function mapCampaign(item: DonationCampaign) {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    description: item.description,
    goalAmount: item.goalAmount ?? null,
    raisedAmount: item.raisedAmount ?? null,
    currency: item.currency,
    imageUrl: item.imageUrl ?? null,
    startsAt: item.startsAt ?? null,
    endsAt: item.endsAt ?? null,
    active: item.active,
    displayOrder: item.displayOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function isCheckViolation(error: unknown) {
  return (error as { code?: string })?.code === '23514';
}
