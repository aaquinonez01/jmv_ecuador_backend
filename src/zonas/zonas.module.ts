import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZonasService } from './zonas.service';
import { ZonasController } from './zonas.controller';
import { Zona } from './entities/zona.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Zona]), CommonModule],
  controllers: [ZonasController],
  providers: [ZonasService],
  exports: [TypeOrmModule],
})
export class ZonasModule {}
