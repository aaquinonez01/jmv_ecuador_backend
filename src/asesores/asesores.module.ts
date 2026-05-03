import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asesor } from './entities/asesor.entity';
import { AsesoresController } from './asesores.controller';
import { AsesoresService } from './asesores.service';

@Module({
  imports: [TypeOrmModule.forFeature([Asesor])],
  controllers: [AsesoresController],
  providers: [AsesoresService],
  exports: [AsesoresService],
})
export class AsesoresModule {}
