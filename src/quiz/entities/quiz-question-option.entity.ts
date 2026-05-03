import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { QuizQuestion } from './quiz-question.entity';
import { QuizSessionAnswer } from './quiz-session-answer.entity';

@Entity('quiz_question_options')
@Unique(['question', 'order'])
export class QuizQuestionOption {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'int' })
  order!: number;

  @Column({ type: 'boolean', default: false })
  isCorrect!: boolean;

  @ManyToOne(() => QuizQuestion, (question) => question.options, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  question!: QuizQuestion;

  @OneToMany(() => QuizSessionAnswer, (answer) => answer.selectedOption)
  answers?: QuizSessionAnswer[];
}
