import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { PointsModule } from 'src/points/points.module';
import {
  Fiesta,
  FiestaCommunityMode,
  FiestaDay,
  FiestaEntry,
  FiestaPhoto,
  FiestaPhotoReaction,
} from './entities/fiesta.entities';
import {
  FiestasAdminController,
  FiestasController,
} from './fiestas.controller';
import { FiestasService } from './fiestas.service';

@Module({
  imports: [
    AuthModule,
    PointsModule,
    TypeOrmModule.forFeature([
      Fiesta,
      FiestaDay,
      FiestaEntry,
      FiestaPhoto,
      FiestaPhotoReaction,
      FiestaCommunityMode,
    ]),
  ],
  controllers: [FiestasController, FiestasAdminController],
  providers: [FiestasService],
})
export class FiestasModule {}
