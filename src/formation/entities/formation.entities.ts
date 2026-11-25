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

export const REFERENCE_TYPES = [
  'biblica',
  'libro',
  'documento',
  'otro',
] as const;
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

export const MATERIAL_TYPES = [
  'pdf',
  'diapositivas',
  'video',
  'enlace',
] as const;
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

export const PRAYER_CATEGORIES = [
  'JMV',
  'Marianas',
  'Vicencianas',
  'Misioneras',
  'Para el día',
] as const;
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

export const SONG_CATEGORIES = [
  'Entrada',
  'Ofertorio',
  'Comunión',
  'Salida',
  'Partes de la misa',
  'Marianos',
  'Vicencianos',
  'Adoración',
  'Alabanza',
  'Espíritu Santo',
  'Animación',
  'Vía crucis',
  'Villancicos',
  'Juveniles',
] as const;
export type SongCategory = (typeof SONG_CATEGORIES)[number];

/** Canto del cancionero. La letra puede llevar acordes entre corchetes: [Do]Santo, [Sol]santo */
@Index('idx_songs_order', ['published', 'category', 'title'])
@Entity('songs')
export class Song {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  author?: string | null;

  @Column({ type: 'varchar', length: 30 })
  category: SongCategory;

  @Column({ type: 'text' })
  lyrics: string;

  /** Tono en el que está escrito (ej.: Do, Lam) */
  @Column({ type: 'varchar', length: 12, nullable: true })
  songKey?: string | null;

  /** Enlace para escucharlo (YouTube, Spotify…) */
  @Column({ type: 'text', nullable: true })
  videoUrl?: string | null;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'bool', default: true })
  published: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}

/**
 * Cómo se guía la enseñanza con "Hazlo ahora":
 * - none: solo se lee
 * - pasos: un paso por pantalla
 * - rosario: el rezo guiado del rosario (misterios del día y cuenta de avemarías)
 */
export const TEACHING_GUIDES = ['none', 'pasos', 'rosario'] as const;
export type TeachingGuide = (typeof TEACHING_GUIDES)[number];

export interface TeachingStep {
  title: string;
  text: string;
}

/** Enseñanza práctica de "¿Qué quieres aprender hoy?": qué es, qué necesitas y los pasos */
@Index('idx_teachings_order', ['published', 'displayOrder'])
@Entity('teachings')
export class Teaching {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  title: string;

  /** Qué es, en pocas líneas */
  @Column({ type: 'text' })
  summary: string;

  /** Qué se necesita (una cosa por elemento) */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  needs: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  steps: TeachingStep[];

  /** Sugerencias para hacerlo en grupo (para el animador) */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  groupSteps: TeachingStep[];

  @Column({ type: 'text', nullable: true })
  source?: string | null;

  @Column({ type: 'varchar', length: 12, default: 'pasos' })
  guide: TeachingGuide;

  /** Nombre del icono (Ionicons) que muestra la app */
  @Column({ type: 'varchar', length: 40, nullable: true })
  icon?: string | null;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'bool', default: true })
  published: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}

export const THEME_AXES = ['humano', 'cristocentrico', 'mariano', 'vicenciano', 'eclesial'] as const;
export type ThemeAxis = (typeof THEME_AXES)[number];

/** De dónde viene una cita de "Quiero profundizar en…" */
export const QUOTE_KINDS = ['biblia', 'iglesia', 'padres', 'vicenciana', 'otro'] as const;
export type QuoteKind = (typeof QUOTE_KINDS)[number];

export interface ThemeQuote {
  kind: QuoteKind;
  text: string;
  /** Cita o fuente: "Jn 6,35", "Catecismo 1324", "San Vicente de Paúl" */
  reference: string;
}

/**
 * Tema de formación: une las preguntas de Gira y Aprende, los libros de la
 * biblioteca y las citas para profundizar. Cada tema pertenece a un eje formativo.
 */
@Index('uq_themes_slug', ['slug'], { unique: true })
@Entity('themes')
export class Theme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 60 })
  slug: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  axis: ThemeAxis;

  /** Categoría de Gira y Aprende a la que corresponde (para sugerir tras fallar preguntas) */
  @Column({ type: 'varchar', length: 30, nullable: true })
  gameCategory?: string | null;

  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  quotes: ThemeQuote[];

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'bool', default: true })
  published: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
