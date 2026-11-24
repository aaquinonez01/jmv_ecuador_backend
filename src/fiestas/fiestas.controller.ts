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
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { RealIpThrottlerGuard } from 'src/common/guards/real-ip-throttler.guard';
import { multerConfig } from 'src/posts/config/multer.config';
import {
  AnswersDto,
  CommunityModeDto,
  CreateDayDto,
  CreateFiestaDto,
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
const isAdmin = (u: User) => u.role === (ValidRoles.ADMIN as string);

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

  /** El cielo del día de la fiesta: quiénes ya se consagraron, por comunidad */
  @Get(':slug/cielo')
  sky(@Param('slug') slug: string) {
    return this.fiestas.sky(slug);
  }

  @Get(':slug/consagracion')
  @Auth(...MEMBER)
  myConsecration(@Param('slug') slug: string, @GetUser() user: User) {
    return this.fiestas.myConsecration(slug, user.id!);
  }

  @Post(':slug/consagracion')
  @Auth(...MEMBER)
  @UseGuards(RealIpThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  consecrate(@Param('slug') slug: string, @GetUser() user: User) {
    return this.fiestas.consecrate(slug, user.id!, isAdmin(user));
  }

  /** Las fotos de recuerdo de todos (día de la fiesta) */
  @Get(':slug/recuerdos')
  keepsakes(@Param('slug') slug: string) {
    return this.fiestas.keepsakes(slug);
  }

  @Get(':slug/recuerdo')
  @Auth(...MEMBER)
  myKeepsake(@Param('slug') slug: string, @GetUser() user: User) {
    return this.fiestas.myKeepsake(slug, user.id!);
  }

  @Post(':slug/recuerdo')
  @Auth(...MEMBER)
  @UseGuards(RealIpThrottlerGuard)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('photo', multerConfig))
  uploadKeepsake(
    @Param('slug') slug: string,
    @GetUser() user: User,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.fiestas.uploadKeepsake(slug, user.id!, file, isAdmin(user));
  }

  @Delete(':slug/recuerdo')
  @Auth(...MEMBER)
  removeMyKeepsake(@Param('slug') slug: string, @GetUser() user: User) {
    return this.fiestas.removeMyKeepsake(slug, user.id!);
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

  /** Administradores: abrir cualquier día antes de su fecha para probarlo */
  @Get(':slug/days/:n/preview')
  @Auth(ValidRoles.ADMIN)
  preview(@Param('slug') slug: string, @Param('n', ParseIntPipe) n: number) {
    return this.fiestas.getDay(slug, n, true);
  }

  /** Administradores: borrar su propio avance de prueba */
  @Delete(':slug/me')
  @Auth(ValidRoles.ADMIN)
  resetMine(@Param('slug') slug: string, @GetUser() user: User) {
    return this.fiestas.resetMine(slug, user.id!);
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
    return this.fiestas.result(slug, n, user.id!, isAdmin(user));
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
    return this.fiestas.answer(slug, n, user.id!, dto, isAdmin(user));
  }

  @Post(':slug/days/:n/purpose')
  @Auth(...MEMBER)
  purpose(
    @Param('slug') slug: string,
    @Param('n', ParseIntPipe) n: number,
    @GetUser() user: User,
  ) {
    return this.fiestas.purpose(slug, n, user.id!, isAdmin(user));
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

  @Post()
  create(@Body() dto: CreateFiestaDto) {
    return this.fiestas.adminCreate(dto);
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

  @Delete('days/:dayId')
  deleteDay(@Param('dayId', ParseUUIDPipe) dayId: string) {
    return this.fiestas.adminDeleteDay(dayId);
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

  @Delete(':id/recuerdos/:userId')
  removeKeepsake(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.fiestas.adminRemoveKeepsake(id, userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.fiestas.adminDelete(id);
  }

  @Get(':id/communities')
  communities(@Param('id', ParseUUIDPipe) id: string) {
    return this.fiestas.adminCommunities(id);
  }

  @Put(':id/communities/:comunidadId')
  setCommunity(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('comunidadId', ParseUUIDPipe) comunidadId: string,
    @Body() dto: CommunityModeDto,
  ) {
    return this.fiestas.adminSetCommunity(id, comunidadId, dto);
  }

  @Post(':id/days')
  addDay(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateDayDto) {
    return this.fiestas.adminAddDay(id, dto);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image', multerConfig))
  uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.fiestas.adminUploadImage(id, file);
  }

  @Get(':id/photos')
  adminPhotos(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: PhotosQueryDto,
  ) {
    return this.fiestas.adminPhotos(id, q.status);
  }
}
