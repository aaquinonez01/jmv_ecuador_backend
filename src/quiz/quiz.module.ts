import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { User } from 'src/auth/entities/user';
import { QuizController } from './quiz.controller';
import { QuizSessionsController } from './quiz-sessions.controller';
import { QuizQuestionOption } from './entities/quiz-question-option.entity';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuizSessionAnswer } from './entities/quiz-session-answer.entity';
import { QuizSessionParticipant } from './entities/quiz-session-participant.entity';
import { QuizSession } from './entities/quiz-session.entity';
import { Quiz } from './entities/quiz.entity';
import { QuizGateway } from './quiz.gateway';
import { QuizService } from './quiz.service';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    TypeOrmModule.forFeature([
      Quiz,
      QuizQuestion,
      QuizQuestionOption,
      QuizSession,
      QuizSessionParticipant,
      QuizSessionAnswer,
      User,
    ]),
  ],
  controllers: [QuizController, QuizSessionsController],
  providers: [QuizService, QuizGateway],
})
export class QuizModule {}
