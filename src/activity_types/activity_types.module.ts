import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityTypeCatalog } from './entities/activity-type.entity';
import { ActivityTypesService } from './activity_types.service';
import { ActivityTypesController } from './activity_types.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityTypeCatalog])],
  controllers: [ActivityTypesController],
  providers: [ActivityTypesService],
  exports: [ActivityTypesService, TypeOrmModule],
})
export class ActivityTypesModule {}
