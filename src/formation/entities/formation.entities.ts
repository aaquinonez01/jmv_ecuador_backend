import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Los cinco ejes formativos de JMV Ecuador (los mismos de la Biblioteca)
export const FORMATION_AXES = [
  'humano',
  'cristocentrico',
  'mariano',
  'vicenciano',
  'eclesial',
] as const;
export type FormationAxis = (typeof FORMATION_AXES)[number];

// Secciones de la Asociación por edad (Estatutos, Art. 8)
export const FORMATION_LEVELS = ['infancia', 'prejuvenil', 'juvenil'] as const;
export type FormationLevel = (typeof FORMATION_LEVELS)[number];

export const REFERENCE_TYPES = ['biblica', 'libro', 'documento', 'otro'] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];

export interface TopicReference {
  type: ReferenceType;
  /** p. ej. "Lc 1, 46-55", "Evangelii Gaudium" o el título del libro */
  title: string;
  /** autor, número, página o lo que ayude a ubicarla */
  detail?: string;
  url?: string;
}

/** Itinerario: un tema que el equipo de formación propone a los grupos */
@Index('idx_formation_topics_order', ['published', 'displayOrder'])
@Entity('formation_topics')
export class FormationTopic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  @Column({ type: 'varchar', length: 20 })
  axis: FormationAxis;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  levels: FormationLevel[];

  /** Subtemas que los grupos pueden conversar */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  subtopics: string[];

  /** Dónde sacar citas y material: Biblia, libros, encíclicas, documentos */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  references: TopicReference[];

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'bool', default: false })
  published: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}

export const MATERIAL_TYPES = ['pdf', 'diapositivas', 'video', 'enlace'] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export interface TrainingMaterial {
  title: string;
  type: MaterialType;
  /** Enlace externo (Drive, YouTube…) */
  url?: string;
  /** PDF subido al servidor (se sirve en /formation/materials/:fileName) */
  fileName?: string;
}

/** Formación nacional (normalmente virtual y mensual) con su material de apoyo */
@Index('idx_national_trainings_date', ['published', 'startsAt'])
@Entity('national_trainings')
export class NationalTraining {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  speaker?: string | null;

  @Column({ type: 'timestamp' })
  startsAt: Date;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  /** Enlace para unirse (Meet, Zoom…) */
  @Column({ type: 'text', nullable: true })
  meetingUrl?: string | null;

  /** Grabación, cuando ya pasó */
  @Column({ type: 'text', nullable: true })
  recordingUrl?: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  materials: TrainingMaterial[];

  @Column({ type: 'bool', default: false })
  published: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}

export const PRAYER_CATEGORIES = ['JMV', 'Marianas', 'Vicencianas', 'Misioneras', 'Para el día'] as const;
export type PrayerCategory = (typeof PRAYER_CATEGORIES)[number];

@Index('idx_prayers_order', ['published', 'category', 'displayOrder'])
@Entity('prayers')
export class Prayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'varchar', length: 30 })
  category: PrayerCategory;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'text', nullable: true })
  source?: string | null;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'bool', default: true })
  published: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
