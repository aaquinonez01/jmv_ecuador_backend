import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { QuizQuestion } from './quiz-question.entity';
import { QuizSession } from './quiz-session.entity';

@Entity('quizzes')
@Unique(['title'])
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 140 })
  title!: string;

  @Column({ type: 'varchar', length: 8, nullable: true })
  emoji?: string | null;

  @Column({ type: 'varchar', length: 120 })
  category!: string;

  @Column({ type: 'varchar', length: 30, default: 'Medio' })
  difficulty!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  color?: string | null;

  @Column('text', { array: true, default: '{}' })
  gradColors!: string[];

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'int', default: 50 })
  maxPlayers!: number;

  @Column({ type: 'int', default: 20 })
  secondsPerQuestion!: number;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  @OneToMany(() => QuizQuestion, (question) => question.quiz, {
    cascade: true,
    eager: true,
  })
  questions!: QuizQuestion[];

  @OneToMany(() => QuizSession, (session) => session.quiz)
  sessions?: QuizSession[];
}
