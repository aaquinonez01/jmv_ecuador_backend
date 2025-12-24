import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityCategory } from './entities/activity-category.entity';
import { ActivityCategoriesService } from './activity_categories.service';
import { ActivityCategoriesController } from './activity_categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityCategory])],
  controllers: [ActivityCategoriesController],
  providers: [ActivityCategoriesService],
  exports: [TypeOrmModule],
})
export class ActivityCategoriesModule {}

