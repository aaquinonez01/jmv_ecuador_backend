import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { activityFilesMulterConfig } from 'src/activities/config/activity-files.config';
import { ConsejoNacionalService } from './consejo-nacional.service';
import { CreateConsejoPeriodDto } from './dto/create-consejo-period.dto';
import { UpdateConsejoPeriodDto } from './dto/update-consejo-period.dto';
import { CreateConsejoMemberDto } from './dto/create-consejo-member.dto';
import { UpdateConsejoMemberDto } from './dto/update-consejo-member.dto';

@Controller('consejo-nacional')
export class ConsejoNacionalController {
  constructor(private readonly service: ConsejoNacionalService) {}

  @Get('periods')
  findAllPeriods() {
    return this.service.findAllPeriods();
  }

  @Get('actual')
  findActual() {
    return this.service.findActualPeriod();
  }

  @Get('periods/:id')
  findOnePeriod(@Param('id') id: string) {
    return this.service.findOnePeriod(id);
  }

  @Post('periods')
  @Auth(ValidRoles.ADMIN)
  createPeriod(@Body() dto: CreateConsejoPeriodDto) {
    return this.service.createPeriod(dto);
  }

  @Patch('periods/:id')
  @Auth(ValidRoles.ADMIN)
  updatePeriod(
    @Param('id') id: string,
    @Body() dto: UpdateConsejoPeriodDto,
  ) {
    return this.service.updatePeriod(id, dto);
  }

  @Delete('periods/:id')
  @Auth(ValidRoles.ADMIN)
  removePeriod(@Param('id') id: string) {
    return this.service.removePeriod(id);
  }

  @Post('periods/:id/members')
  @Auth(ValidRoles.ADMIN)
  @UseInterceptors(FileInterceptor('image', activityFilesMulterConfig))
  createMember(
    @Param('id') periodId: string,
    @Body() dto: CreateConsejoMemberDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.service.createMember(periodId, dto, image);
  }

  @Patch('members/:id')
  @Auth(ValidRoles.ADMIN)
  @UseInterceptors(FileInterceptor('image', activityFilesMulterConfig))
  updateMember(
    @Param('id') id: string,
    @Body() dto: UpdateConsejoMemberDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.service.updateMember(id, dto, image);
  }

  @Delete('members/:id')
  @Auth(ValidRoles.ADMIN)
  removeMember(@Param('id') id: string) {
    return this.service.removeMember(id);
  }
}
