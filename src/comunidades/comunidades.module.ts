import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comunidad } from './entities/comunidad.entity';
import { Zona } from 'src/zonas/entities/zona.entity';
import { ComunidadesService } from './comunidades.service';
import { ComunidadesController } from './comunidades.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Comunidad, Zona])],
  controllers: [ComunidadesController],
  providers: [ComunidadesService],
  exports: [TypeOrmModule],
})
export class ComunidadesModule {}
