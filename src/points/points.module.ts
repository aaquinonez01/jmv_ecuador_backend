import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { User } from 'src/auth/entities/user';
import { Comunidad } from 'src/comunidades/entities/comunidad.entity';
import { PointsRule, PointsTransaction } from './entities/points.entities';
import { PointsController } from './points.controller';
import { PointsService } from './points.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([User, Comunidad, PointsTransaction, PointsRule]),
  ],
  controllers: [PointsController],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
