import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsIn } from 'class-validator';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { RealIpThrottlerGuard } from 'src/common/guards/real-ip-throttler.guard';
import {
  AdminUpsertQuestionDto,
  AnswerDto,
  CreateMatchDto,
  CrownDto,
  ListQuestionsDto,
  PackQueryDto,
  PracticeDto,
  UpsertQuestionDto,
} from './dto/game.dto';
import { GameQuestionsService } from './game-questions.service';
import { GameService } from './game.service';

class StatusDto {
  @IsIn(['approved', 'pending', 'rejected'])
  status!: string;
}

const MEMBER = [ValidRoles.ADMIN, ValidRoles.USER] as const;

// Gira y Aprende: juego de preguntas por turnos entre miembros de JMV
@Controller('game')
export class GameController {
  constructor(
    private readonly game: GameService,
    private readonly questions: GameQuestionsService,
  ) {}

  // ── App ──

  /** Paquete de preguntas para jugar sin conexión (incremental con ?since=) */
  @Get('pack')
  @Auth(...MEMBER)
  pack(@Query() q: PackQueryDto) {
    return this.questions.pack(q.since);
  }

  @Get('matches')
  @Auth(...MEMBER)
  list(@GetUser() user: User) {
    return this.game.list(user.id!);
  }

  @Post('matches')
  @Auth(...MEMBER)
  @UseGuards(RealIpThrottlerGuard)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  create(@GetUser() user: User, @Body() dto: CreateMatchDto) {
    return this.game.create(user.id!, dto);
  }

  @Get('matches/:id')
  @Auth(...MEMBER)
  get(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.game.get(user.id!, id);
  }

  @Post('matches/:id/spin')
  @Auth(...MEMBER)
  spin(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.game.spin(user.id!, id);
  }

  @Post('matches/:id/crown')
  @Auth(...MEMBER)
  crown(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CrownDto,
  ) {
    return this.game.crown(user.id!, id, dto.category);
  }

  @Post('matches/:id/answer')
  @Auth(...MEMBER)
  answer(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AnswerDto,
  ) {
    return this.game.answer(user.id!, id, dto);
  }

  @Post('matches/:id/resign')
  @Auth(...MEMBER)
  resign(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.game.resign(user.id!, id);
  }

  /** Resultado de la práctica sin conexión (se envía al volver la señal) */
  @Post('practice')
  @Auth(...MEMBER)
  @UseGuards(RealIpThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  practice(@GetUser() user: User, @Body() dto: PracticeDto) {
    return this.game.practice(user.id!, dto.correct, dto.total);
  }

  @Post('questions/propose')
  @Auth(...MEMBER)
  @UseGuards(RealIpThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  propose(@GetUser() user: User, @Body() dto: UpsertQuestionDto) {
    return this.questions.propose(user.id!, dto);
  }

  // ── Admin: banco de preguntas ──

  @Get('admin/questions')
  @Auth(ValidRoles.ADMIN)
  adminList(@Query() q: ListQuestionsDto) {
    return this.questions.list(q);
  }

  @Post('admin/questions')
  @Auth(ValidRoles.ADMIN)
  adminCreate(@Body() dto: AdminUpsertQuestionDto) {
    return this.questions.create(dto);
  }

  @Put('admin/questions/:id')
  @Auth(ValidRoles.ADMIN)
  adminUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpsertQuestionDto,
  ) {
    return this.questions.update(id, dto);
  }

  @Patch('admin/questions/:id/status')
  @Auth(ValidRoles.ADMIN)
  adminStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StatusDto) {
    return this.questions.setStatus(id, dto.status);
  }

  @Delete('admin/questions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(ValidRoles.ADMIN)
  adminRemove(@Param('id', ParseUUIDPipe) id: string) {
    return this.questions.remove(id);
  }
}
