import { User } from 'src/auth/entities/user';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { QuizSession } from './quiz-session.entity';
import { QuizSessionAnswer } from './quiz-session-answer.entity';

@Entity('quiz_session_participants')
@Unique(['session', 'user'])
export class QuizSessionParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'boolean', default: true })
  isConnected!: boolean;

  @Column({ type: 'int', default: 0 })
  totalScore!: number;

  @Column({ type: 'int', default: 0 })
  totalResponseMs!: number;

  @Column({ type: 'int', nullable: true })
  rank?: number | null;

  @Column({ type: 'boolean', default: false })
  isWinner!: boolean;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  joinedAt!: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastSeenAt!: Date;

  @ManyToOne(() => QuizSession, (session) => session.participants, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  session!: QuizSession;

  @ManyToOne(() => User, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
  })
  user!: User;

  @OneToMany(() => QuizSessionAnswer, (answer) => answer.participant)
  answers?: QuizSessionAnswer[];
}
