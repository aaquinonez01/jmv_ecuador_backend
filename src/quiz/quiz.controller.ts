import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { CreateQuizSessionDto } from './dto/create-quiz-session.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { QuizService } from './quiz.service';

@Controller('quizzes')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post()
  @Auth(ValidRoles.ADMIN)
  create(@Body() dto: CreateQuizDto) {
    return this.quizService.createQuiz(dto);
  }

  @Get()
  @Auth(ValidRoles.ADMIN)
  findAll() {
    return this.quizService.findAllQuizzes();
  }

  @Get(':id')
  @Auth(ValidRoles.ADMIN)
  findOne(@Param('id') id: string) {
    return this.quizService.findOneQuiz(id);
  }

  @Patch(':id')
  @Auth(ValidRoles.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateQuizDto) {
    return this.quizService.updateQuiz(id, dto);
  }

  @Delete(':id')
  @Auth(ValidRoles.ADMIN)
  remove(@Param('id') id: string) {
    return this.quizService.deactivateQuiz(id);
  }

  @Post(':id/sessions')
  @Auth(ValidRoles.ADMIN)
  createSession(
    @Param('id') id: string,
    @Body() dto: CreateQuizSessionDto,
    @GetUser() user: User,
  ) {
    return this.quizService.createSession(id, user, dto);
  }
}
