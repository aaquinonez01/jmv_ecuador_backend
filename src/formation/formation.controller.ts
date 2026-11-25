import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import {
  libraryMulterConfig,
  resolveStoredFile,
} from 'src/library/storage/library-storage';
import {
  UpsertMoodDto,
  UpsertPrayerDto,
  UpsertSongDto,
  UpsertTeachingDto,
  UpsertThemeDto,
  UpsertTopicDto,
  UpsertTrainingDto,
} from './dto/formation.dto';
import { FormationService } from './formation.service';

// Formación en la app: itinerarios para los grupos, formaciones nacionales
// con su material de apoyo, y oraciones. Se administra desde la web.
@Controller('formation')
export class FormationController {
  constructor(private readonly service: FormationService) {}

  // ── App (miembros con sesión) ──

  @Get('topics')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  topics() {
    return this.service.findTopics();
  }

  @Get('topics/:id')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  topic(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findTopic(id);
  }

  @Get('trainings')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  trainings() {
    return this.service.findTrainings();
  }

  @Get('trainings/:id')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  training(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findTraining(id);
  }

  @Get('prayers')
  prayers() {
    return this.service.findPrayers();
  }

  @Get('songs')
  songs() {
    return this.service.findSongs();
  }

  /** "¿Cómo estás hoy?": estados de ánimo con su palabra */
  @Get('moods')
  moods() {
    return this.service.findMoods();
  }

  /** Temas de formación con sus citas para profundizar */
  @Get('themes')
  themes() {
    return this.service.findThemes();
  }

  @Get('teachings')
  teachings() {
    return this.service.findTeachings();
  }

  /** Evangelio de la misa de hoy (o de ?date=AAAA-MM-DD, cercana a hoy) */
  @Get('gospel')
  gospel(@Query('date') date?: string) {
    return this.service.dailyGospel(date);
  }

  /** PDF de material de apoyo (nombre aleatorio generado al subirlo) */
  @Get('materials/:name')
  material(@Param('name') name: string, @Res() res: Response) {
    const path = resolveStoredFile(name);
    if (!path) throw new NotFoundException('Material no encontrado');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path, (err) => {
      if (err && !res.headersSent)
        res.status(404).json({ message: 'Material no encontrado' });
    });
  }

  // ── Administración ──

  @Post('admin/materials')
  @Auth(ValidRoles.ADMIN)
  @UseInterceptors(FileInterceptor('file', libraryMulterConfig))
  uploadMaterial(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Adjunta un PDF');
    return {
      fileName: file.filename,
      size: file.size,
      originalName: file.originalname,
    };
  }

  @Get('admin/topics')
  @Auth(ValidRoles.ADMIN)
  adminTopics() {
    return this.service.findTopics(true);
  }

  @Get('admin/topics/:id')
  @Auth(ValidRoles.ADMIN)
  adminTopic(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findTopic(id, true);
  }

  @Post('admin/topics')
  @Auth(ValidRoles.ADMIN)
  createTopic(@Body() dto: UpsertTopicDto) {
    return this.service.createTopic(dto);
  }

  @Patch('admin/topics/:id')
  @Auth(ValidRoles.ADMIN)
  updateTopic(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertTopicDto,
  ) {
    return this.service.updateTopic(id, dto);
  }

  @Delete('admin/topics/:id')
  @Auth(ValidRoles.ADMIN)
  removeTopic(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeTopic(id);
  }

  @Get('admin/trainings')
  @Auth(ValidRoles.ADMIN)
  adminTrainings() {
    return this.service.findTrainings(true);
  }

  @Get('admin/trainings/:id')
  @Auth(ValidRoles.ADMIN)
  adminTraining(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findTraining(id, true);
  }

  @Post('admin/trainings')
  @Auth(ValidRoles.ADMIN)
  createTraining(@Body() dto: UpsertTrainingDto) {
    return this.service.createTraining(dto);
  }

  @Patch('admin/trainings/:id')
  @Auth(ValidRoles.ADMIN)
  updateTraining(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertTrainingDto,
  ) {
    return this.service.updateTraining(id, dto);
  }

  @Delete('admin/trainings/:id')
  @Auth(ValidRoles.ADMIN)
  removeTraining(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeTraining(id);
  }

  @Get('admin/prayers')
  @Auth(ValidRoles.ADMIN)
  adminPrayers() {
    return this.service.findPrayers(true);
  }

  @Post('admin/prayers')
  @Auth(ValidRoles.ADMIN)
  createPrayer(@Body() dto: UpsertPrayerDto) {
    return this.service.createPrayer(dto);
  }

  @Patch('admin/prayers/:id')
  @Auth(ValidRoles.ADMIN)
  updatePrayer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertPrayerDto,
  ) {
    return this.service.updatePrayer(id, dto);
  }

  @Delete('admin/prayers/:id')
  @Auth(ValidRoles.ADMIN)
  removePrayer(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removePrayer(id);
  }

  @Get('admin/songs')
  @Auth(ValidRoles.ADMIN)
  adminSongs() {
    return this.service.findSongs(true);
  }

  @Post('admin/songs')
  @Auth(ValidRoles.ADMIN)
  createSong(@Body() dto: UpsertSongDto) {
    return this.service.createSong(dto);
  }

  @Patch('admin/songs/:id')
  @Auth(ValidRoles.ADMIN)
  updateSong(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertSongDto,
  ) {
    return this.service.updateSong(id, dto);
  }

  @Delete('admin/songs/:id')
  @Auth(ValidRoles.ADMIN)
  removeSong(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeSong(id);
  }

  @Get('admin/teachings')
  @Auth(ValidRoles.ADMIN)
  adminTeachings() {
    return this.service.findTeachings(true);
  }

  @Post('admin/teachings')
  @Auth(ValidRoles.ADMIN)
  createTeaching(@Body() dto: UpsertTeachingDto) {
    return this.service.createTeaching(dto);
  }

  @Patch('admin/teachings/:id')
  @Auth(ValidRoles.ADMIN)
  updateTeaching(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertTeachingDto,
  ) {
    return this.service.updateTeaching(id, dto);
  }

  @Delete('admin/teachings/:id')
  @Auth(ValidRoles.ADMIN)
  removeTeaching(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeTeaching(id);
  }

  @Get('admin/themes')
  @Auth(ValidRoles.ADMIN)
  adminThemes() {
    return this.service.findThemes(true);
  }

  @Post('admin/themes')
  @Auth(ValidRoles.ADMIN)
  createTheme(@Body() dto: UpsertThemeDto) {
    return this.service.createTheme(dto);
  }

  @Patch('admin/themes/:id')
  @Auth(ValidRoles.ADMIN)
  updateTheme(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertThemeDto,
  ) {
    return this.service.updateTheme(id, dto);
  }

  @Delete('admin/themes/:id')
  @Auth(ValidRoles.ADMIN)
  removeTheme(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeTheme(id);
  }

  @Get('admin/moods')
  @Auth(ValidRoles.ADMIN)
  adminMoods() {
    return this.service.findMoods(true);
  }

  @Post('admin/moods')
  @Auth(ValidRoles.ADMIN)
  createMood(@Body() dto: UpsertMoodDto) {
    return this.service.createMood(dto);
  }

  @Patch('admin/moods/:id')
  @Auth(ValidRoles.ADMIN)
  updateMood(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertMoodDto,
  ) {
    return this.service.updateMood(id, dto);
  }

  @Delete('admin/moods/:id')
  @Auth(ValidRoles.ADMIN)
  removeMood(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeMood(id);
  }
}
