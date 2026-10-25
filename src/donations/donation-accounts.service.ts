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
import { CreateDonationAccountDto } from './dto/create-donation-account.dto';
import { UpdateDonationAccountDto } from './dto/update-donation-account.dto';
import {
  isCheckViolation,
  mapAccount,
  revalidateDonations,
} from './donations.shared';
import { DonationAccount } from './entities/donation-account.entity';

const OPTIONAL_FIELDS = ['holderId', 'holderRole', 'email', 'notes'] as const;

@Injectable()
export class DonationAccountsService {
  private readonly logger = new Logger('DonationAccountsService');

  constructor(
    @InjectRepository(DonationAccount)
    private readonly repository: Repository<DonationAccount>,
    private readonly revalidation: RevalidationService,
  ) {}

  async create(dto: CreateDonationAccountDto) {
    try {
      const saved = await this.repository.save(
        this.repository.create({
          bankName: dto.bankName,
          accountType: dto.accountType,
          accountNumber: dto.accountNumber,
          holderName: dto.holderName,
          holderId: dto.holderId ?? null,
          holderRole: dto.holderRole ?? null,
          email: dto.email ?? null,
          notes: dto.notes ?? null,
          active: dto.active ?? true,
          displayOrder: dto.displayOrder ?? 0,
        }),
      );
      revalidateDonations(this.revalidation);
      return mapAccount(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll() {
    try {
      const items = await this.repository.find({
        order: { displayOrder: 'ASC', createdAt: 'ASC' },
      });
      return { items: items.map(mapAccount) };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findActive() {
    const items = await this.repository.find({
      where: { active: true },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
    return items.map(mapAccount);
  }

  async findOne(id: string) {
    const item = await this.repository.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Cuenta no encontrada');
    return mapAccount(item);
  }

  async update(id: string, dto: UpdateDonationAccountDto) {
    try {
      const item = await this.repository.findOne({ where: { id } });
      if (!item) throw new NotFoundException('Cuenta no encontrada');

      if (dto.bankName) item.bankName = dto.bankName;
      if (dto.accountType) item.accountType = dto.accountType;
      if (dto.accountNumber) item.accountNumber = dto.accountNumber;
      if (dto.holderName) item.holderName = dto.holderName;
      for (const field of OPTIONAL_FIELDS) {
        if (dto[field] !== undefined) item[field] = dto[field];
      }
      if (dto.active !== undefined) item.active = dto.active;
      if (dto.displayOrder !== undefined && dto.displayOrder !== null) {
        item.displayOrder = dto.displayOrder;
      }

      const saved = await this.repository.save(item);
      revalidateDonations(this.revalidation);
      return mapAccount(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const item = await this.repository.findOne({ where: { id } });
      if (!item) throw new NotFoundException('Cuenta no encontrada');
      await this.repository.remove(item);
      revalidateDonations(this.revalidation);
      return { message: 'Cuenta eliminada correctamente' };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: unknown): never {
    if (error instanceof HttpException) throw error;
    if (isCheckViolation(error)) {
      throw new BadRequestException('Revisa los datos de la cuenta');
    }
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Error al gestionar las cuentas para donaciones',
    );
  }
}
