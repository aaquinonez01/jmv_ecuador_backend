import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsejoPeriod } from './entities/consejo-period.entity';
import { ConsejoMember } from './entities/consejo-member.entity';
import { ConsejoNacionalController } from './consejo-nacional.controller';
import { ConsejoNacionalService } from './consejo-nacional.service';

@Module({
  imports: [TypeOrmModule.forFeature([ConsejoPeriod, ConsejoMember])],
  controllers: [ConsejoNacionalController],
  providers: [ConsejoNacionalService],
  exports: [ConsejoNacionalService],
})
export class ConsejoNacionalModule {}
