import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const DONATION_ACCOUNT_TYPES = ['ahorros', 'corriente'] as const;
export type DonationAccountType = (typeof DONATION_ACCOUNT_TYPES)[number];

// Cuenta bancaria para transferencias (normalmente a nombre del Tesorero/a)
@Index('idx_donation_accounts_active_order', ['active', 'displayOrder'])
@Check(
  'chk_donation_accounts_type',
  `"accountType" IN ('ahorros', 'corriente')`,
)
@Entity('donation_accounts')
export class DonationAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  bankName!: string;

  @Column({ type: 'varchar', length: 20 })
  accountType!: DonationAccountType;

  // Texto: conserva ceros a la izquierda y guiones
  @Column({ type: 'varchar', length: 40 })
  accountNumber!: string;

  @Column({ type: 'varchar', length: 150 })
  holderName!: string;

  // Cédula o RUC
  @Column({ type: 'varchar', length: 13, nullable: true })
  holderId?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  holderRole?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'bool', default: true })
  active!: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
