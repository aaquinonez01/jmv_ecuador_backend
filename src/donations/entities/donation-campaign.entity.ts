import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type ValueTransformer,
} from 'typeorm';

// Postgres devuelve los decimal como texto; la API los entrega como número
const decimalToNumber: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

// Campaña con meta: el tesorero actualiza a mano lo recaudado
@Index('idx_donation_campaigns_active_order', ['active', 'displayOrder'])
@Check(
  'chk_donation_campaigns_goal',
  '"goalAmount" IS NULL OR "goalAmount" >= 0',
)
@Check(
  'chk_donation_campaigns_raised',
  '"raisedAmount" IS NULL OR "raisedAmount" >= 0',
)
@Check(
  'chk_donation_campaigns_dates',
  '"startsAt" IS NULL OR "endsAt" IS NULL OR "endsAt" >= "startsAt"',
)
@Entity('donation_campaigns')
export class DonationCampaign {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalToNumber,
  })
  goalAmount?: number | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalToNumber,
  })
  raisedAmount?: number | null;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  imagePublicId?: string | null;

  // Fechas solo día (AAAA-MM-DD); sin fecha = sin límite
  @Column({ type: 'date', nullable: true })
  startsAt?: string | null;

  @Column({ type: 'date', nullable: true })
  endsAt?: string | null;

  @Column({ type: 'bool', default: true })
  active!: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
