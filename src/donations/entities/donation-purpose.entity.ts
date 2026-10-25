import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Iconos de lucide que puede elegir el admin
export const DONATION_PURPOSE_ICONS = [
  'Heart',
  'HandHeart',
  'Users',
  'BookOpen',
  'Tent',
  'Church',
  'GraduationCap',
  'Gift',
  'Sparkles',
  'Globe',
] as const;
export type DonationPurposeIcon = (typeof DONATION_PURPOSE_ICONS)[number];

// "En qué se usa tu donación"
@Index('idx_donation_purposes_active_order', ['active', 'displayOrder'])
@Check(
  'chk_donation_purposes_icon',
  `"icon" IN (${DONATION_PURPOSE_ICONS.map((icon) => `'${icon}'`).join(', ')})`,
)
@Entity('donation_purposes')
export class DonationPurpose {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 30, default: 'Heart' })
  icon!: DonationPurposeIcon;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  imagePublicId?: string | null;

  @Column({ type: 'bool', default: true })
  active!: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
