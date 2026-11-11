import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormationEncounter } from './entities/formation-encounter.entity';
import { FormationProgress } from './entities/formation-progress.entity';
import { FormationController } from './formation.controller';
import { FormationService } from './formation.service';

@Module({
  imports: [TypeOrmModule.forFeature([FormationEncounter, FormationProgress])],
  controllers: [FormationController],
  providers: [FormationService],
})
export class FormationModule {}
