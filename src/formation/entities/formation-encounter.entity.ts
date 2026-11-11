import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Pasos del camino de un joven JMV (Manual de JMV, 2015; Estatutos Arts. 7 y 9)
export const FORMATION_STEPS = [
  'integracion',
  'admision',
  'promesa',
  'consagracion',
  'desembocadura',
] as const;
export type FormationStep = (typeof FORMATION_STEPS)[number];

// Los cuatro pilares de JMV (Manual de JMV, p. 12)
export const FORMATION_PILLARS = [
  'comunidad',
  'espiritualidad',
  'apostolado',
  'formacion',
] as const;
export type FormationPillar = (typeof FORMATION_PILLARS)[number];

/** Contemplar: la Palabra y la oración con que abre el encuentro */
export interface ContemplarMoment {
  passageRef?: string;
  passageText?: string;
  prayer?: string;
}

/** Vivir: el contenido del tema en tarjetas cortas */
export interface VivirMoment {
  cards: { title?: string; body: string }[];
  videoUrl?: string;
  /** slug de un documento de la Biblioteca para profundizar */
  documentSlug?: string;
}

/** Servir: el compromiso concreto para la semana */
export interface ServirMoment {
  commitment: string;
}

export interface FormationQuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
}

@Index('idx_formation_encounters_order', ['step', 'displayOrder'])
@Entity('formation_encounters')
export class FormationEncounter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  @Column({ type: 'varchar', length: 20 })
  step: FormationStep;

  @Column({ type: 'varchar', length: 20, nullable: true })
  pillar?: FormationPillar | null;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'int', default: 15 })
  durationMinutes: number;

  @Column({ type: 'text', nullable: true })
  coverImageUrl?: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  contemplar: ContemplarMoment;

  @Column({ type: 'jsonb', default: () => `'{"cards":[]}'` })
  vivir: VivirMoment;

  @Column({ type: 'jsonb', default: () => `'{"commitment":""}'` })
  servir: ServirMoment;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  reflectionQuestions: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  quiz: FormationQuizQuestion[];

  /** De dónde sale el contenido, p. ej. "Manual de JMV (2015), pp. 13-14" */
  @Column({ type: 'text', nullable: true })
  source?: string | null;

  @Column({ type: 'bool', default: false })
  published: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
