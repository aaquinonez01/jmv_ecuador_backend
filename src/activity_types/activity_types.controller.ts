import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ActivityTypesService } from './activity_types.service';
import { CreateActivityTypeDto } from './dto/create-activity-type.dto';
import { UpdateActivityTypeDto } from './dto/update-activity-type.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';

@Controller('activity-types')
export class ActivityTypesController {
  constructor(private readonly service: ActivityTypesService) {}

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
  create(@Body() dto: CreateActivityTypeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Auth(ValidRoles.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateActivityTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Auth(ValidRoles.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
