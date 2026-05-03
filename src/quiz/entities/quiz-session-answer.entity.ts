import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { QuizQuestion } from './quiz-question.entity';
import { QuizQuestionOption } from './quiz-question-option.entity';
import { QuizSession } from './quiz-session.entity';
import { QuizSessionParticipant } from './quiz-session-participant.entity';

@Entity('quiz_session_answers')
@Unique(['session', 'participant', 'question'])
export class QuizSessionAnswer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'boolean', default: false })
  isCorrect!: boolean;

  @Column({ type: 'int', default: 0 })
  responseMs!: number;

  @Column({ type: 'int', default: 0 })
  points!: number;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  answeredAt!: Date;

  @ManyToOne(() => QuizSession, (session) => session.answers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  session!: QuizSession;

  @ManyToOne(
    () => QuizSessionParticipant,
    (participant) => participant.answers,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  participant!: QuizSessionParticipant;

  @ManyToOne(() => QuizQuestion, (question) => question.answers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  question!: QuizQuestion;

  @ManyToOne(() => QuizQuestionOption, (option) => option.answers, {
    nullable: true,
    eager: true,
    onDelete: 'SET NULL',
  })
  selectedOption?: QuizQuestionOption | null;
}
