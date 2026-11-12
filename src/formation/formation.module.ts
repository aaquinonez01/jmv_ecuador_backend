import { PushModule } from 'src/push/push.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  FormationTopic,
  NationalTraining,
  Prayer,
} from './entities/formation.entities';
import { FormationController } from './formation.controller';
import { FormationService } from './formation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FormationTopic, NationalTraining, Prayer]),
    PushModule,
  ],
  controllers: [FormationController],
  providers: [FormationService],
})
export class FormationModule {}
