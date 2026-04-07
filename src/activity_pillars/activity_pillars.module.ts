import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityPillar } from './entities/activity-pillar.entity';
import { ActivityPillarsService } from './activity_pillars.service';
import { ActivityPillarsController } from './activity_pillars.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityPillar])],
  controllers: [ActivityPillarsController],
  providers: [ActivityPillarsService],
  exports: [ActivityPillarsService, TypeOrmModule],
})
export class ActivityPillarsModule {}
