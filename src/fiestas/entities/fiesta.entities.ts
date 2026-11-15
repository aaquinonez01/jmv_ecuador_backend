import { User } from 'src/auth/entities/user';
import { Comunidad } from 'src/comunidades/entities/comunidad.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Fiestas del Año Vicenciano con dinámica en la web (sql/2026-11-fiestas.sql):
// una fiesta tiene uno o varios días (novena, triduo o solo el día), cada día
// con su tema, preguntas y propósito, y un mural de fotos por comunidad.

export interface FiestaQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
}

/** Cómo vive cada comunidad la fiesta en persona */
export const FIESTA_MODES = ['novena', 'triduo', 'dia'] as const;
export type FiestaMode = (typeof FIESTA_MODES)[number];

export const PHOTO_STATUS = ['pending', 'approved', 'rejected'] as const;
export type PhotoStatus = (typeof PHOTO_STATUS)[number];

export const REACTIONS = ['pray', 'heart', 'fire'] as const;
export type Reaction = (typeof REACTIONS)[number];

@Entity('fiestas')
export class Fiesta {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('uq_fiestas_slug', { unique: true })
  @Column({ type: 'varchar', length: 60 })
  slug!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  subtitle?: string | null;

  /** Día de la fiesta (el gran día) */
  @Column({ type: 'date' })
  feastDate!: string;

  @Column({ type: 'text', nullable: true })
  intro?: string | null;

  /** Oraciones que se rezan todos los días (se muestran en cada día) */
  @Column({ type: 'text', nullable: true })
  dailyPrayers?: string | null;

  @Column({ type: 'boolean', default: false })
  published!: boolean;

  @OneToMany(() => FiestaDay, (d) => d.fiesta)
  days?: FiestaDay[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Index('uq_fiesta_days_number', ['fiesta', 'dayNumber'], { unique: true })
@Entity('fiesta_days')
export class FiestaDay {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Fiesta, (f) => f.days, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  fiesta!: Fiesta;

  @Column({ type: 'int' })
  dayNumber!: number;

  /** Desde este día (hora de Ecuador) se puede abrir */
  @Column({ type: 'date' })
  date!: string;

  /** "Día 1", "Fiesta"… */
  @Column({ type: 'varchar', length: 40 })
  label!: string;

  @Column({ type: 'text', default: '' })
  title!: string;

  /** Pieza de la medalla (o insignia) que se gana al completar el día */
  @Column({ type: 'varchar', length: 30 })
  piece!: string;

  @Column({ type: 'text', nullable: true })
  theme?: string | null;

  @Column({ type: 'text', nullable: true })
  prayer?: string | null;

  @Column({ type: 'text', nullable: true })
  purpose?: string | null;

  /** De dónde se tomó el texto (libro, página) */
  @Column({ type: 'text', nullable: true })
  source?: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  questions!: FiestaQuestion[];

  /** Mientras sea false el día se muestra como "en preparación" */
  @Column({ type: 'boolean', default: false })
  published!: boolean;

  @UpdateDateColumn()
  updatedAt!: Date;
}

/** Lo que hizo cada persona en cada día (una sola fila por persona y día) */
@Index('uq_fiesta_entries_user_day', ['day', 'user'], { unique: true })
@Index('idx_fiesta_entries_user', ['user'])
@Entity('fiesta_entries')
export class FiestaEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => FiestaDay, { nullable: false, onDelete: 'CASCADE' })
  day!: FiestaDay;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user!: User;

  /** Índice elegido por pregunta; null = aún no respondió */
  @Column({ type: 'jsonb', nullable: true })
  answers?: number[] | null;

  @Column({ type: 'int', default: 0 })
  correct!: number;

  @Column({ type: 'int', default: 0 })
  total!: number;

  /** Respondió el mismo día (bono) */
  @Column({ type: 'boolean', default: false })
  onTime!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  answeredAt?: Date | null;

  @Column({ type: 'boolean', default: false })
  purposeDone!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  purposeAt?: Date | null;

  /** Puntos ganados en este día (preguntas + bono + propósito) */
  @Column({ type: 'int', default: 0 })
  points!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

/** Mural "Así lo vivimos": fotos de cada comunidad por día (con moderación) */
@Index('idx_fiesta_photos_day', ['day', 'status'])
@Index('idx_fiesta_photos_comunidad', ['comunidad'])
@Entity('fiesta_photos')
export class FiestaPhoto {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => FiestaDay, { nullable: false, onDelete: 'CASCADE' })
  day!: FiestaDay;

  @ManyToOne(() => Comunidad, { nullable: false, onDelete: 'CASCADE' })
  comunidad!: Comunidad;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  user?: User | null;

  @Column({ type: 'text' })
  url!: string;

  @Column({ type: 'text', nullable: true })
  publicId?: string | null;

  @Column({ type: 'text', nullable: true })
  caption?: string | null;

  @Column({ type: 'varchar', length: 10, default: 'pending' })
  status!: PhotoStatus;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('fiesta_photo_reactions')
export class FiestaPhotoReaction {
  @PrimaryColumn('uuid')
  photoId!: string;

  @PrimaryColumn('uuid')
  userId!: string;

  @PrimaryColumn({ type: 'varchar', length: 8 })
  emoji!: Reaction;

  @ManyToOne(() => FiestaPhoto, { onDelete: 'CASCADE' })
  photo?: FiestaPhoto;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user?: User;
}

/** Cómo vive la fiesta cada comunidad (lo elige su responsable) */
@Entity('fiesta_community_modes')
export class FiestaCommunityMode {
  @PrimaryColumn('uuid')
  fiestaId!: string;

  @PrimaryColumn('uuid')
  comunidadId!: string;

  @Column({ type: 'varchar', length: 10 })
  mode!: FiestaMode;

  @ManyToOne(() => Fiesta, { onDelete: 'CASCADE' })
  fiesta?: Fiesta;

  @ManyToOne(() => Comunidad, { onDelete: 'CASCADE' })
  comunidad?: Comunidad;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
