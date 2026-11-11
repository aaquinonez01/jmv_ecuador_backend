import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/auth/entities/user';
import { FormationEncounter } from './formation-encounter.entity';

// Encuentros que cada joven marcó como vividos. Las reflexiones personales NO
// se guardan aquí: quedan solo en el teléfono del joven.
@Index('uq_formation_progress_user_encounter', ['userId', 'encounterId'], { unique: true })
@Entity('formation_progress')
export class FormationProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'uuid' })
  encounterId: string;

  @ManyToOne(() => FormationEncounter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'encounterId' })
  encounter?: FormationEncounter;

  /** Aciertos en el quiz del encuentro (si lo hizo) */
  @Column({ type: 'int', nullable: true })
  quizScore?: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  completedAt: Date;
}
