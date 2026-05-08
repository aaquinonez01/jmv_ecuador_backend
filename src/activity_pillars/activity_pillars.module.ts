import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityPillar } from './entities/activity-pillar.entity';
import { ActivityPillarsService } from './activity_pillars.service';
import { ActivityPillarsController } from './activity_pillars.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityPillar]), CommonModule],
  controllers: [ActivityPillarsController],
  providers: [ActivityPillarsService],
  exports: [ActivityPillarsService, TypeOrmModule],
})
export class ActivityPillarsModule {}
