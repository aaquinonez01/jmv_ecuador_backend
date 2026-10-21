import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityCategory } from './entities/activity-category.entity';
import { ActivityCategoriesService } from './activity_categories.service';
import { ActivityCategoriesController } from './activity_categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityCategory]), CommonModule],
  controllers: [ActivityCategoriesController],
  providers: [ActivityCategoriesService],
  exports: [TypeOrmModule],
})
export class ActivityCategoriesModule {}
