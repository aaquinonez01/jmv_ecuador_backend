import { User } from 'src/auth/entities/user';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { QuizSessionStatus } from '../interfaces/quiz-session-status.enum';
import { Quiz } from './quiz.entity';
import { QuizSessionParticipant } from './quiz-session-participant.entity';
import { QuizSessionAnswer } from './quiz-session-answer.entity';

@Entity('quiz_sessions')
@Unique(['roomCode'])
export class QuizSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 6 })
  roomCode!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: QuizSessionStatus.WAITING,
  })
  status!: QuizSessionStatus;

  @Column({ type: 'int', default: -1 })
  currentQuestionIndex!: number;

  @Column({ type: 'timestamp', nullable: true })
  currentQuestionEndsAt?: Date | null;

  @Column({ type: 'int', default: 50 })
  maxPlayers!: number;

  @Column({ type: 'int', default: 20 })
  secondsPerQuestion!: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endedAt?: Date | null;

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

  @ManyToOne(() => Quiz, (quiz) => quiz.sessions, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
  })
  quiz!: Quiz;

  @ManyToOne(() => User, {
    nullable: true,
    eager: true,
    onDelete: 'SET NULL',
  })
  host?: User | null;

  @ManyToOne(() => User, {
    nullable: true,
    eager: true,
    onDelete: 'SET NULL',
  })
  winner?: User | null;

  @OneToMany(
    () => QuizSessionParticipant,
    (participant) => participant.session,
    {
      cascade: true,
      eager: true,
    },
  )
  participants!: QuizSessionParticipant[];

  @OneToMany(() => QuizSessionAnswer, (answer) => answer.session, {
    cascade: true,
    eager: true,
  })
  answers?: QuizSessionAnswer[];
}
