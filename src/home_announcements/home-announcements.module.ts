import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomeAnnouncement } from './entities/home-announcement.entity';
import { HomeAnnouncementsController } from './home-announcements.controller';
import { HomeAnnouncementsService } from './home-announcements.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([HomeAnnouncement]), CommonModule],
  controllers: [HomeAnnouncementsController],
  providers: [HomeAnnouncementsService],
  exports: [HomeAnnouncementsService],
})
export class HomeAnnouncementsModule {}
