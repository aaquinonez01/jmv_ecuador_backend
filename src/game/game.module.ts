import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PointsModule } from 'src/points/points.module';
import { PushModule } from 'src/push/push.module';
import { GameController } from './game.controller';
import { GameQuestionsService } from './game-questions.service';
import { GameService } from './game.service';

@Module({
  imports: [AuthModule, PointsModule, PushModule],
  controllers: [GameController],
  providers: [GameService, GameQuestionsService],
})
export class GameModule {}
