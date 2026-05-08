import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { RevalidationService } from './revalidation/revalidation.service';

@Module({
  controllers: [HealthController],
  providers: [RevalidationService],
  exports: [RevalidationService],
})
export class CommonModule {}
