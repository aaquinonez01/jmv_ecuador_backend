import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { CreateStatuteVersionDto } from './dto/create-statute-version.dto';
import { UpdateStatuteVersionDto } from './dto/update-statute-version.dto';
import { StatutesService } from './statutes.service';

@Controller('statutes')
export class StatutesController {
  constructor(private readonly service: StatutesService) {}

  @Get('current')
  findCurrent() {
    return this.service.findCurrent();
  }

  @Get('public')
  findPublic() {
    return this.service.findPublic();
  }

  @Get('public/:slug')
  findPublicBySlug(@Param('slug') slug: string) {
    return this.service.findPublicBySlug(slug);
  }

  @Get()
  @Auth(ValidRoles.ADMIN)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Auth(ValidRoles.ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Auth(ValidRoles.ADMIN)
  create(@Body() dto: CreateStatuteVersionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Auth(ValidRoles.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatuteVersionDto,
  ) {
    return this.service.update(id, dto);
  }

  @Post(':id/make-current')
  @HttpCode(200)
  @Auth(ValidRoles.ADMIN)
  makeCurrent(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.makeCurrent(id);
  }

  @Delete(':id')
  @Auth(ValidRoles.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
