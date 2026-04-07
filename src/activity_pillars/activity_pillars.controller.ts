import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ActivityPillarsService } from './activity_pillars.service';
import { CreateActivityPillarDto } from './dto/create-activity-pillar.dto';
import { UpdateActivityPillarDto } from './dto/update-activity-pillar.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';

@Controller('activity-pillars')
export class ActivityPillarsController {
  constructor(private readonly service: ActivityPillarsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Auth(ValidRoles.ADMIN)
  create(@Body() dto: CreateActivityPillarDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Auth(ValidRoles.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateActivityPillarDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Auth(ValidRoles.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
