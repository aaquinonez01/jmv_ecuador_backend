import { Controller, ForbiddenException, Get } from '@nestjs/common';
import { SeedService } from './seed.service';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { Auth } from 'src/auth/decorators/auth.decorator';

@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get()
  @Auth(ValidRoles.ADMIN)
  executeSeed() {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ENABLE_SEED !== 'true'
    ) {
      throw new ForbiddenException('Seed deshabilitado en producción');
    }
    return this.seedService.executeSeed();
  }
}
