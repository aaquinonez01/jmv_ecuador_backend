import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UpcomingActivity } from './entities/upcoming-activity.entity';
import { UpcomingActivityDocument } from './entities/upcoming-activity-document.entity';
import { UpcomingActivitiesService } from './upcoming_activities.service';
import { UpcomingActivitiesController } from './upcoming_activities.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UpcomingActivity, UpcomingActivityDocument]),
    CommonModule,
  ],
  controllers: [UpcomingActivitiesController],
  providers: [UpcomingActivitiesService],
})
export class UpcomingActivitiesModule {}
