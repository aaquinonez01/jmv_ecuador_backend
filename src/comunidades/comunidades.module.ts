import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comunidad } from './entities/comunidad.entity';
import { Zona } from 'src/zonas/entities/zona.entity';
import { ComunidadesService } from './comunidades.service';
import { ComunidadesController } from './comunidades.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Comunidad, Zona]), CommonModule],
  controllers: [ComunidadesController],
  providers: [ComunidadesService],
  exports: [TypeOrmModule],
})
export class ComunidadesModule {}
