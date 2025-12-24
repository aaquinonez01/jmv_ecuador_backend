import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteImage } from './entities/site-image.entity';
import { SiteImagesService } from './site_images.service';
import { SiteImagesController } from './site_images.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SiteImage])],
  controllers: [SiteImagesController],
  providers: [SiteImagesService],
})
export class SiteImagesModule {}

