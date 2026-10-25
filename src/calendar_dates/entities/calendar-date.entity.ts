import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const CALENDAR_CATEGORIES = [
  'maria',
  'fundadores',
  'santos',
  'familia',
  'jmv',
  'ecuador',
] as const;
export type CalendarCategory = (typeof CALENDAR_CATEGORIES)[number];

// Fecha fija del Año Vicenciano (se repite cada año el mismo día y mes)
@Index('idx_calendar_dates_published_order', [
  'published',
  'month',
  'day',
  'displayOrder',
])
@Check('chk_calendar_dates_month', '"month" BETWEEN 1 AND 12')
@Check('chk_calendar_dates_day', '"day" BETWEEN 1 AND 31')
@Entity('calendar_dates')
export class CalendarDate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  subtitle?: string | null;

  @Column({ type: 'smallint' })
  month!: number;

  @Column({ type: 'smallint' })
  day!: number;

  // Año del hecho histórico (para mostrar aniversarios), opcional
  @Column({ type: 'int', nullable: true })
  year?: number | null;

  @Column({ type: 'varchar', length: 20 })
  category!: CalendarCategory;

  @Column({ type: 'text' })
  summary!: string;

  @Column({ type: 'text', nullable: true })
  story?: string | null;

  @Column({ type: 'text', nullable: true })
  quote?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  quoteAuthor?: string | null;

  @Column({ type: 'text', nullable: true })
  challenge?: string | null;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string | null;

  // Solo para imágenes subidas a Cloudinary (permite borrarlas)
  @Column({ type: 'text', nullable: true })
  imagePublicId?: string | null;

  @Column({ type: 'text', nullable: true })
  source?: string | null;

  @Column({ type: 'bool', default: false })
  verified!: boolean;

  @Column({ type: 'bool', default: true })
  published!: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
