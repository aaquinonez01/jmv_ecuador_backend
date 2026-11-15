import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { RealIpThrottlerGuard } from 'src/common/guards/real-ip-throttler.guard';
import { multerConfig } from 'src/posts/config/multer.config';
import {
  AnswersDto,
  LeadDto,
  LeadsQueryDto,
  ModeDto,
  PhotoStatusDto,
  PhotosQueryDto,
  PhotoUploadDto,
  ReactDto,
  UpdateDayDto,
  UpdateFiestaDto,
} from './dto/fiesta.dto';
import { FiestasService } from './fiestas.service';

const MEMBER = [ValidRoles.ADMIN, ValidRoles.USER] as const;

// Fiestas del Año Vicenciano en la web: novena / triduo / día, con preguntas y mural
@Controller('fiestas')
export class FiestasController {
  constructor(private readonly fiestas: FiestasService) {}

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.fiestas.getPublic(slug);
  }

  @Get(':slug/ranking')
  ranking(@Param('slug') slug: string) {
    return this.fiestas.ranking(slug);
  }

  @Get(':slug/photos')
  photos(@Param('slug') slug: string, @Query('day') day?: string) {
    const n = day ? parseInt(day, 10) : undefined;
    return this.fiestas.listPhotos(slug, n && n > 0 ? n : undefined);
  }

  @Get(':slug/days/:n')
  day(@Param('slug') slug: string, @Param('n', ParseIntPipe) n: number) {
    return this.fiestas.getDay(slug, n);
  }

  @Get(':slug/me')
  @Auth(...MEMBER)
  me(@Param('slug') slug: string, @GetUser() user: User) {
    return this.fiestas.me(slug, user.id!);
  }

  @Get(':slug/days/:n/result')
  @Auth(...MEMBER)
  result(
    @Param('slug') slug: string,
    @Param('n', ParseIntPipe) n: number,
    @GetUser() user: User,
  ) {
    return this.fiestas.result(slug, n, user.id!);
  }

  @Post(':slug/days/:n/answers')
  @Auth(...MEMBER)
  @UseGuards(RealIpThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  answer(
    @Param('slug') slug: string,
    @Param('n', ParseIntPipe) n: number,
    @GetUser() user: User,
    @Body() dto: AnswersDto,
  ) {
    return this.fiestas.answer(slug, n, user.id!, dto);
  }

  @Post(':slug/days/:n/purpose')
  @Auth(...MEMBER)
  purpose(
    @Param('slug') slug: string,
    @Param('n', ParseIntPipe) n: number,
    @GetUser() user: User,
  ) {
    return this.fiestas.purpose(slug, n, user.id!);
  }

  @Get(':slug/my-reactions')
  @Auth(...MEMBER)
  myReactions(@Param('slug') slug: string, @GetUser() user: User) {
    return this.fiestas.myReactions(slug, user.id!);
  }

  @Post('photos/:id/react')
  @Auth(...MEMBER)
  @UseGuards(RealIpThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  react(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
    @Body() dto: ReactDto,
  ) {
    return this.fiestas.react(id, user.id!, dto.emoji);
  }

  // ── Comunidad (responsable) ──

  @Get(':slug/comunidad')
  @Auth(...MEMBER)
  community(@Param('slug') slug: string, @GetUser() user: User) {
    return this.fiestas.myCommunity(slug, user.id!);
  }

  @Put(':slug/comunidad/mode')
  @Auth(...MEMBER)
  setMode(
    @Param('slug') slug: string,
    @GetUser() user: User,
    @Body() dto: ModeDto,
  ) {
    return this.fiestas.setMode(slug, user.id!, dto.mode);
  }

  @Post(':slug/days/:n/photos')
  @Auth(...MEMBER)
  @UseGuards(RealIpThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(FilesInterceptor('photos', 10, multerConfig))
  upload(
    @Param('slug') slug: string,
    @Param('n', ParseIntPipe) n: number,
    @GetUser() user: User,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: PhotoUploadDto,
  ) {
    return this.fiestas.uploadPhotos(slug, n, user.id!, files, dto.caption);
  }

  @Delete('photos/:id')
  @Auth(...MEMBER)
  removeOwn(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.fiestas.removeOwnPhoto(id, user.id!);
  }
}

// Administración (ruta aparte para no chocar con /fiestas/:slug)
@Controller('admin/fiestas')
@Auth(ValidRoles.ADMIN)
export class FiestasAdminController {
  constructor(private readonly fiestas: FiestasService) {}

  @Get()
  list() {
    return this.fiestas.adminList();
  }

  @Get('leads')
  leads(@Query() q: LeadsQueryDto) {
    return this.fiestas.adminLeads(q);
  }

  @Patch('leads/:userId')
  setLead(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: LeadDto,
  ) {
    return this.fiestas.adminSetLead(userId, dto.lead);
  }

  @Put('days/:dayId')
  updateDay(
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @Body() dto: UpdateDayDto,
  ) {
    return this.fiestas.adminUpdateDay(dayId, dto);
  }

  @Patch('photos/:photoId')
  photoStatus(
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Body() dto: PhotoStatusDto,
  ) {
    return this.fiestas.adminSetPhotoStatus(photoId, dto.status);
  }

  @Delete('photos/:photoId')
  deletePhoto(@Param('photoId', ParseUUIDPipe) photoId: string) {
    return this.fiestas.adminDeletePhoto(photoId);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.fiestas.adminGet(id);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFiestaDto) {
    return this.fiestas.adminUpdate(id, dto);
  }

  @Get(':id/photos')
  adminPhotos(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: PhotosQueryDto,
  ) {
    return this.fiestas.adminPhotos(id, q.status);
  }
}
