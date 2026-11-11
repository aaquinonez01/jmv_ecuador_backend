import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { CompleteEncounterDto, UpsertEncounterDto } from './dto/formation.dto';
import { FormationService } from './formation.service';

@Controller('formation')
export class FormationController {
  constructor(private readonly service: FormationService) {}

  // ── Joven (app) ──

  /** "Mi camino": encuentros publicados con el progreso de quien consulta */
  @Get('my-path')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  myPath(@GetUser() user: User) {
    return this.service.findMyPath(user.id!);
  }

  @Get('encounters/:id')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findPublished(id);
  }

  @Post('encounters/:id/complete')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteEncounterDto,
    @GetUser() user: User,
  ) {
    return this.service.complete(user.id!, id, dto);
  }

  // ── Administración (web) ──

  @Get('admin/encounters')
  @Auth(ValidRoles.ADMIN)
  findAllAdmin() {
    return this.service.findAllAdmin();
  }

  @Get('admin/encounters/:id')
  @Auth(ValidRoles.ADMIN)
  findOneAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOneAdmin(id);
  }

  @Post('admin/encounters')
  @Auth(ValidRoles.ADMIN)
  create(@Body() dto: UpsertEncounterDto) {
    return this.service.create(dto);
  }

  @Patch('admin/encounters/:id')
  @Auth(ValidRoles.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpsertEncounterDto) {
    return this.service.update(id, dto);
  }

  @Delete('admin/encounters/:id')
  @Auth(ValidRoles.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
