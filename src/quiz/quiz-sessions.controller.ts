import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { FilterQuizSessionsDto } from './dto/filter-quiz-sessions.dto';
import { QuizService } from './quiz.service';

@Controller('quiz-sessions')
export class QuizSessionsController {
  constructor(private readonly quizService: QuizService) {}

  @Get()
  @Auth(ValidRoles.ADMIN)
  findAll(@Query() filterDto: FilterQuizSessionsDto) {
    return this.quizService.findAllSessions(filterDto);
  }

  @Get('open')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  findOpenSessions() {
    return this.quizService.findOpenSessions();
  }

  @Get('my-history')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  findMyHistory(@GetUser() user: User) {
    return this.quizService.findUserHistory(user.id!);
  }

  @Get(':id')
  @Auth(ValidRoles.ADMIN)
  findOne(@Param('id') id: string) {
    return this.quizService.findOneSession(id);
  }

  @Get(':id/state')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  getState(@Param('id') id: string, @GetUser() user: User) {
    return this.quizService.getSessionState(id, user);
  }

  @Post(':id/start')
  @Auth(ValidRoles.ADMIN)
  start(@Param('id') id: string, @GetUser() user: User) {
    return this.quizService.startSession(id, user.id!);
  }

  @Post(':id/cancel')
  @Auth(ValidRoles.ADMIN)
  cancel(@Param('id') id: string, @GetUser() user: User) {
    return this.quizService.cancelSession(id, user.id!);
  }

  @Delete(':id')
  @Auth(ValidRoles.ADMIN)
  remove(@Param('id') id: string) {
    return this.quizService.removeSession(id);
  }
}
