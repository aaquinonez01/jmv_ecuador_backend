import { PushModule } from 'src/push/push.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  FormationTopic,
  NationalTraining,
  Prayer,
  Song,
  Teaching,
} from './entities/formation.entities';
import { FormationController } from './formation.controller';
import { FormationService } from './formation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormationTopic,
      NationalTraining,
      Prayer,
      Song,
      Teaching,
    ]),
    PushModule,
  ],
  controllers: [FormationController],
  providers: [FormationService],
})
export class FormationModule {}
