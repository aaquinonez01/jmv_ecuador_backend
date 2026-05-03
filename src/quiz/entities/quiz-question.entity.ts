import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Quiz } from './quiz.entity';
import { QuizQuestionOption } from './quiz-question-option.entity';
import { QuizSessionAnswer } from './quiz-session-answer.entity';

@Entity('quiz_questions')
@Unique(['quiz', 'order'])
export class QuizQuestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  prompt!: string;

  @Column({ type: 'text', nullable: true })
  explanation?: string | null;

  @Column({ type: 'int' })
  order!: number;

  @ManyToOne(() => Quiz, (quiz) => quiz.questions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  quiz!: Quiz;

  @OneToMany(() => QuizQuestionOption, (option) => option.question, {
    cascade: true,
    eager: true,
  })
  options!: QuizQuestionOption[];

  @OneToMany(() => QuizSessionAnswer, (answer) => answer.question)
  answers?: QuizSessionAnswer[];
}
