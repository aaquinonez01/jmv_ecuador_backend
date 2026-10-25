import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { StatuteVersion } from './entities/statute-version.entity';
import { StatutesController } from './statutes.controller';
import { StatutesService } from './statutes.service';

@Module({
  imports: [TypeOrmModule.forFeature([StatuteVersion]), CommonModule],
  controllers: [StatutesController],
  providers: [StatutesService],
})
export class StatutesModule {}
