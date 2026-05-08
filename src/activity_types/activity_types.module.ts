import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityTypeCatalog } from './entities/activity-type.entity';
import { ActivityTypesService } from './activity_types.service';
import { ActivityTypesController } from './activity_types.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityTypeCatalog]), CommonModule],
  controllers: [ActivityTypesController],
  providers: [ActivityTypesService],
  exports: [ActivityTypesService, TypeOrmModule],
})
export class ActivityTypesModule {}
