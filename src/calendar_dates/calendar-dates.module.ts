import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { CalendarDate } from './entities/calendar-date.entity';
import { CalendarDatesService } from './calendar-dates.service';
import { CalendarDatesController } from './calendar-dates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CalendarDate]), CommonModule],
  controllers: [CalendarDatesController],
  providers: [CalendarDatesService],
})
export class CalendarDatesModule {}
