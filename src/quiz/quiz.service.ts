import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Server } from 'socket.io';
import { User } from 'src/auth/entities/user';
import { Repository } from 'typeorm';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { CreateQuizSessionDto } from './dto/create-quiz-session.dto';
import { FilterQuizSessionsDto } from './dto/filter-quiz-sessions.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { QuizQuestionOption } from './entities/quiz-question-option.entity';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuizSessionAnswer } from './entities/quiz-session-answer.entity';
import { QuizSessionParticipant } from './entities/quiz-session-participant.entity';
import { QuizSession } from './entities/quiz-session.entity';
import { Quiz } from './entities/quiz.entity';
import { QuizSessionStatus } from './interfaces/quiz-session-status.enum';

interface SessionRuntime {
  timeout?: NodeJS.Timeout;
  questionStartedAt?: number;
  questionEndsAt?: Date;
  closing?: boolean;
}

const SESSION_ROOM_PREFIX = 'quiz-session-';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private readonly questionRepository: Repository<QuizQuestion>,
    @InjectRepository(QuizQuestionOption)
    private readonly optionRepository: Repository<QuizQuestionOption>,
    @InjectRepository(QuizSession)
    private readonly sessionRepository: Repository<QuizSession>,
    @InjectRepository(QuizSessionParticipant)
    private readonly participantRepository: Repository<QuizSessionParticipant>,
    @InjectRepository(QuizSessionAnswer)
    private readonly answerRepository: Repository<QuizSessionAnswer>,
  ) {}

  private readonly logger = new Logger('QuizService');
  private io: Server | null = null;
  private readonly runtimeBySession = new Map<string, SessionRuntime>();
  private readonly socketSessions = new Map<string, Set<string>>();
  private readonly sessionUserSockets = new Map<
    string,
    Map<string, Set<string>>
  >();

  bindSocketServer(server: Server) {
    this.io = server;
  }

  getSessionRoom(sessionId: string) {
    return `${SESSION_ROOM_PREFIX}${sessionId}`;
  }

  async createQuiz(dto: CreateQuizDto) {
    this.ensureQuestionSetValidity(dto.questions);

    try {
      const quiz = this.quizRepository.create({
        title: dto.title.trim(),
        emoji: dto.emoji?.trim(),
        category: dto.category.trim(),
        difficulty: dto.difficulty.trim(),
        color: dto.color?.trim(),
        gradColors: dto.gradColors ?? [],
        active: dto.active ?? true,
        maxPlayers: dto.maxPlayers ?? 50,
        secondsPerQuestion: dto.secondsPerQuestion ?? 20,
        questions: dto.questions
          .sort((a, b) => a.order - b.order)
          .map((question) =>
            this.questionRepository.create({
              prompt: question.prompt.trim(),
              explanation: question.explanation?.trim(),
              order: question.order,
              options: question.options
                .sort((a, b) => a.order - b.order)
                .map((option) =>
                  this.optionRepository.create({
                    text: option.text.trim(),
                    order: option.order,
                    isCorrect: option.isCorrect,
                  }),
                ),
            }),
          ),
      });

      const saved = await this.quizRepository.save(quiz);
      return this.mapQuiz(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAllQuizzes() {
    const quizzes = await this.quizRepository.find({
      relations: ['questions', 'questions.options'],
      order: {
        createdAt: 'DESC',
        questions: { order: 'ASC', options: { order: 'ASC' } },
      },
    });
    return quizzes.map((quiz) => this.mapQuiz(quiz));
  }

  async findOneQuiz(id: string) {
    const quiz = await this.quizRepository.findOne({
      where: { id },
      relations: ['questions', 'questions.options'],
      order: { questions: { order: 'ASC', options: { order: 'ASC' } } },
    });
    if (!quiz) {
      throw new NotFoundException('Quiz no encontrado');
    }
    return this.mapQuiz(quiz);
  }

  async updateQuiz(id: string, dto: UpdateQuizDto) {
    const existing = await this.quizRepository.findOne({
      where: { id },
      relations: ['questions', 'questions.options'],
      order: { questions: { order: 'ASC', options: { order: 'ASC' } } },
    });
    if (!existing) {
      throw new NotFoundException('Quiz no encontrado');
    }

    if (dto.questions) {
      this.ensureQuestionSetValidity(dto.questions);
    }

    try {
      existing.title = dto.title?.trim() ?? existing.title;
      existing.emoji = dto.emoji?.trim() ?? existing.emoji;
      existing.category = dto.category?.trim() ?? existing.category;
      existing.difficulty = dto.difficulty?.trim() ?? existing.difficulty;
      existing.color = dto.color?.trim() ?? existing.color;
      existing.gradColors = dto.gradColors ?? existing.gradColors;
      existing.active = dto.active ?? existing.active;
      existing.maxPlayers = dto.maxPlayers ?? existing.maxPlayers;
      existing.secondsPerQuestion =
        dto.secondsPerQuestion ?? existing.secondsPerQuestion;

      if (dto.questions) {
        await this.questionRepository.delete({
          quiz: { id: existing.id } as Quiz,
        });
        existing.questions = dto.questions
          .sort((a, b) => a.order - b.order)
          .map((question) =>
            this.questionRepository.create({
              prompt: question.prompt.trim(),
              explanation: question.explanation?.trim(),
              order: question.order,
              options: question.options
                .sort((a, b) => a.order - b.order)
                .map((option) =>
                  this.optionRepository.create({
                    text: option.text.trim(),
                    order: option.order,
                    isCorrect: option.isCorrect,
                  }),
                ),
            }),
          );
      }

      const saved = await this.quizRepository.save(existing);
      return this.mapQuiz(saved);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async deactivateQuiz(id: string) {
    const quiz = await this.quizRepository.findOne({ where: { id } });
    if (!quiz) {
      throw new NotFoundException('Quiz no encontrado');
    }

    quiz.active = false;
    await this.quizRepository.save(quiz);
    return { message: 'Quiz inactivado correctamente' };
  }

  async createSession(quizId: string, host: User, dto: CreateQuizSessionDto) {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: ['questions', 'questions.options'],
      order: { questions: { order: 'ASC', options: { order: 'ASC' } } },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz no encontrado');
    }
    if (!quiz.active) {
      throw new BadRequestException('El quiz estÃ¡ inactivo');
    }
    if (!quiz.questions.length) {
      throw new BadRequestException('El quiz no tiene preguntas');
    }

    const roomCode = await this.generateUniqueRoomCode();
    const session = this.sessionRepository.create({
      roomCode,
      status: QuizSessionStatus.WAITING,
      currentQuestionIndex: -1,
      maxPlayers: dto.maxPlayers ?? quiz.maxPlayers,
      secondsPerQuestion: dto.secondsPerQuestion ?? quiz.secondsPerQuestion,
      host,
      quiz,
      participants: [],
    });

    const saved = await this.sessionRepository.save(session);
    return this.mapSession(saved);
  }

  async findAllSessions(filter: FilterQuizSessionsDto) {
    const { status, quizId, limit = 50, offset = 0 } = filter;
    const qb = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.quiz', 'quiz')
      .leftJoinAndSelect('session.host', 'host')
      .leftJoinAndSelect('session.winner', 'winner')
      .leftJoinAndSelect('session.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'participantUser')
      .orderBy('session.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    if (status) {
      qb.andWhere('session.status = :status', { status });
    }
    if (quizId) {
      qb.andWhere('quiz.id = :quizId', { quizId });
    }

    const [items, total] = await qb.getManyAndCount();
    return {
      total,
      items: items.map((session) => this.mapSession(session)),
    };
  }

  async findOneSession(id: string) {
    const session = await this.findSessionOrFail(id);
    return this.mapSessionDetail(session);
  }

  async findOpenSessions() {
    const sessions = await this.sessionRepository.find({
      where: { status: QuizSessionStatus.WAITING },
      relations: ['quiz', 'participants', 'participants.user'],
      order: { createdAt: 'DESC' },
    });

    return sessions.map((session) => ({
      id: session.id,
      roomCode: session.roomCode,
      status: session.status,
      participantCount: session.participants.length,
      maxPlayers: session.maxPlayers,
      secondsPerQuestion: session.secondsPerQuestion,
      quiz: {
        id: session.quiz.id,
        title: session.quiz.title,
        emoji: session.quiz.emoji,
        color: session.quiz.color,
        gradColors: session.quiz.gradColors,
        difficulty: session.quiz.difficulty,
        questionCount: session.quiz.questions.length,
        category: session.quiz.category,
      },
    }));
  }

  async findUserHistory(userId: string) {
    const sessions = await this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.quiz', 'quiz')
      .leftJoinAndSelect('quiz.questions', 'questions')
      .leftJoinAndSelect('session.host', 'host')
      .leftJoinAndSelect('session.winner', 'winner')
      .leftJoinAndSelect('session.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'participantUser')
      .where('session.status IN (:...statuses)', {
        statuses: [QuizSessionStatus.FINISHED, QuizSessionStatus.CANCELLED],
      })
      .andWhere(
        'EXISTS (SELECT 1 FROM quiz_session_participants p ' +
          'WHERE p."sessionId" = session.id AND p."userId" = :userId)',
        { userId },
      )
      .orderBy('session.endedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('session.createdAt', 'DESC')
      .take(50)
      .getMany();

    return sessions.map((session) => {
      const myParticipant = session.participants.find(
        (item) => item.user.id === userId,
      );
      const totalParticipants = session.participants.length;
      return {
        id: session.id,
        roomCode: session.roomCode,
        status: session.status,
        endedAt: session.endedAt,
        startedAt: session.startedAt,
        createdAt: session.createdAt,
        totalParticipants,
        quiz: {
          id: session.quiz.id,
          title: session.quiz.title,
          emoji: session.quiz.emoji,
          category: session.quiz.category,
          difficulty: session.quiz.difficulty,
          color: session.quiz.color,
          gradColors: session.quiz.gradColors,
          questionCount: session.quiz.questions.length,
        },
        winner: session.winner
          ? {
              id: session.winner.id,
              name: session.winner.displayName || session.winner.fullName,
            }
          : null,
        me: myParticipant
          ? {
              score: myParticipant.totalScore,
              rank: myParticipant.rank,
              isWinner: myParticipant.isWinner,
              totalResponseMs: myParticipant.totalResponseMs,
            }
          : null,
      };
    });
  }

  async getSessionState(sessionId: string, user: User) {
    const session = await this.findSessionOrFail(sessionId);
    const isHost = this.isHostUser(session, user.id ?? null);
    const participant = session.participants.find(
      (item) => item.user.id === user.id,
    );

    if (
      !participant &&
      !isHost &&
      session.status !== QuizSessionStatus.WAITING
    ) {
      throw new ForbiddenException('No perteneces a esta sesiÃ³n');
    }

    return this.buildSessionSnapshot(session, user.id!);
  }

  async startSession(sessionId: string, hostUserId: string) {
    const session = await this.findSessionOrFail(sessionId);
    if (session.host?.id !== hostUserId) {
      throw new ForbiddenException('Solo el host puede iniciar la sesiÃ³n');
    }
    if (session.status !== QuizSessionStatus.WAITING) {
      throw new BadRequestException('La sesiÃ³n no estÃ¡ en espera');
    }
    if (!session.participants.length) {
      throw new BadRequestException('No hay participantes en la sesiÃ³n');
    }

    session.status = QuizSessionStatus.IN_PROGRESS;
    session.startedAt = new Date();
    session.currentQuestionIndex = 0;
    await this.sessionRepository.save(session);

    this.emitToSession(session.id, 'session.started', {
      sessionId: session.id,
      startedAt: session.startedAt.toISOString(),
    });

    await this.startQuestion(session.id);
    return this.mapSession(session);
  }

  async cancelSession(sessionId: string, hostUserId: string) {
    const session = await this.findSessionOrFail(sessionId);
    if (session.host?.id !== hostUserId) {
      throw new ForbiddenException('Solo el host puede cancelar la sesiÃ³n');
    }
    if (
      session.status === QuizSessionStatus.CANCELLED ||
      session.status === QuizSessionStatus.FINISHED
    ) {
      return this.mapSession(session);
    }

    this.clearSessionRuntime(session.id);
    session.status = QuizSessionStatus.CANCELLED;
    session.endedAt = new Date();
    session.currentQuestionEndsAt = null;
    await this.sessionRepository.save(session);

    this.emitToSession(session.id, 'session.cancelled', {
      sessionId: session.id,
      endedAt: session.endedAt.toISOString(),
    });
    return this.mapSession(session);
  }

  async removeSession(sessionId: string) {
    const session = await this.findSessionOrFail(sessionId);
    if (session.status === QuizSessionStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'No se puede eliminar una sesion en progreso. Cancelala primero.',
      );
    }

    this.emitToSession(session.id, 'session.deleted', {
      sessionId: session.id,
    });
    this.clearSessionRuntime(session.id);
    this.clearSessionSocketLinks(session.id);

    await this.sessionRepository.delete({ id: session.id });
    return {
      message: 'Sesion eliminada correctamente',
      id: session.id,
    };
  }

  async joinSession(
    user: User,
    sessionId: string | undefined,
    roomCode: string,
    socketId?: string,
  ) {
    const session = await this.findSessionForJoin(sessionId, roomCode);
    const isHost = this.isHostUser(session, user.id ?? null);
    if (session.roomCode.toUpperCase() !== roomCode.trim().toUpperCase()) {
      throw new BadRequestException('INVALID_CODE');
    }
    if (
      session.status === QuizSessionStatus.CANCELLED ||
      session.status === QuizSessionStatus.FINISHED
    ) {
      throw new BadRequestException('SESSION_NOT_JOINABLE');
    }

    let participant = session.participants.find(
      (item) => item.user.id === user.id,
    );

    if (
      session.status === QuizSessionStatus.IN_PROGRESS &&
      !participant &&
      !isHost
    ) {
      throw new ForbiddenException('LATE_JOIN_NOT_ALLOWED');
    }

    if (!participant && !isHost) {
      if (session.participants.length >= session.maxPlayers) {
        throw new ConflictException('ROOM_FULL');
      }
      participant = this.participantRepository.create({
        session,
        user,
        isConnected: true,
        joinedAt: new Date(),
        lastSeenAt: new Date(),
        totalScore: 0,
        totalResponseMs: 0,
      });
      await this.participantRepository.save(participant);
    } else if (participant) {
      participant.isConnected = true;
      participant.lastSeenAt = new Date();
      await this.participantRepository.save(participant);
    }

    if (socketId) {
      this.linkSocketToSessionUser(socketId, session.id, user.id!);
    }

    const refreshed = await this.findSessionOrFail(session.id);
    this.emitPresence(refreshed);
    return this.buildSessionSnapshot(refreshed, user.id!);
  }

  async leaveSession(userId: string, sessionId: string, socketId?: string) {
    if (socketId) {
      this.unlinkSocketFromSessionUser(socketId, sessionId, userId);
    }
    await this.syncParticipantConnection(sessionId, userId);
    const session = await this.findSessionOrFail(sessionId);
    this.emitPresence(session);
    return { message: 'SesiÃ³n abandonada' };
  }

  async disconnectSocket(socketId: string, userId: string) {
    const sessions = this.socketSessions.get(socketId);
    if (!sessions) {
      return;
    }

    for (const sessionId of sessions) {
      this.unlinkSocketFromSessionUser(socketId, sessionId, userId);
      await this.syncParticipantConnection(sessionId, userId);
      const session = await this.findSessionOrFail(sessionId);
      this.emitPresence(session);
    }
  }

  async submitAnswer(
    user: User,
    sessionId: string,
    questionId: string,
    optionId: string,
  ) {
    const session = await this.findSessionOrFail(sessionId);
    if (session.status !== QuizSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('SESSION_NOT_ACTIVE');
    }

    const participant = session.participants.find(
      (item) => item.user.id === user.id,
    );
    if (!participant) {
      throw new ForbiddenException('NOT_IN_SESSION');
    }

    const currentQuestion = this.getOrderedQuestions(session.quiz.questions)[
      session.currentQuestionIndex
    ];
    if (!currentQuestion || currentQuestion.id !== questionId) {
      throw new BadRequestException('QUESTION_NOT_ACTIVE');
    }

    const alreadyAnswered = await this.answerRepository.findOne({
      where: {
        session: { id: session.id },
        participant: { id: participant.id },
        question: { id: questionId },
      },
    });
    if (alreadyAnswered) {
      throw new ConflictException('ALREADY_ANSWERED');
    }

    const selectedOption = currentQuestion.options.find(
      (option) => option.id === optionId,
    );
    if (!selectedOption) {
      throw new BadRequestException('INVALID_OPTION');
    }

    const runtime = this.runtimeBySession.get(session.id);
    const startedAt = runtime?.questionStartedAt ?? Date.now();
    const durationMs = session.secondsPerQuestion * 1000;
    const responseMs = Math.min(
      Math.max(Date.now() - startedAt, 0),
      durationMs,
    );
    const isCorrect = !!selectedOption.isCorrect;
    const bonus = isCorrect
      ? Math.round(((durationMs - responseMs) / durationMs) * 50)
      : 0;
    const points = isCorrect ? 100 + bonus : 0;

    const answer = this.answerRepository.create({
      session,
      participant,
      question: currentQuestion,
      selectedOption,
      isCorrect,
      responseMs,
      points,
      answeredAt: new Date(),
    });
    await this.answerRepository.save(answer);

    participant.totalScore += points;
    participant.totalResponseMs += responseMs;
    participant.lastSeenAt = new Date();
    await this.participantRepository.save(participant);

    const answersCount = await this.answerRepository.count({
      where: { session: { id: session.id }, question: { id: questionId } },
    });

    const participantCount = session.participants.length;
    if (answersCount >= participantCount) {
      await this.closeQuestion(session.id, true);
    }

    return {
      questionId,
      points,
      isCorrect,
      responseMs,
    };
  }

  private ensureQuestionSetValidity(questions: CreateQuizDto['questions']) {
    const questionOrders = new Set<number>();

    for (const question of questions) {
      if (questionOrders.has(question.order)) {
        throw new BadRequestException(
          'Cada pregunta debe tener un orden Ãºnico',
        );
      }
      questionOrders.add(question.order);

      const optionOrders = new Set<number>();
      let correctCount = 0;
      for (const option of question.options) {
        if (optionOrders.has(option.order)) {
          throw new BadRequestException(
            'Cada opciÃ³n debe tener un orden Ãºnico por pregunta',
          );
        }
        optionOrders.add(option.order);
        if (option.isCorrect) {
          correctCount += 1;
        }
      }

      if (correctCount !== 1) {
        throw new BadRequestException(
          'Cada pregunta debe tener exactamente una opciÃ³n correcta',
        );
      }
    }
  }

  private async generateUniqueRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let attempt = 0; attempt < 20; attempt += 1) {
      let code = '';
      for (let index = 0; index < 6; index += 1) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      const exists = await this.sessionRepository.findOne({
        where: { roomCode: code },
      });
      if (!exists) {
        return code;
      }
    }
    throw new InternalServerErrorException('No se pudo generar cÃ³digo de sala');
  }

  private async findSessionOrFail(sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: [
        'quiz',
        'quiz.questions',
        'quiz.questions.options',
        'participants',
        'participants.user',
        'winner',
        'answers',
        'answers.participant',
        'answers.question',
        'answers.selectedOption',
      ],
      order: {
        quiz: { questions: { order: 'ASC', options: { order: 'ASC' } } },
        participants: { joinedAt: 'ASC' },
      },
    });

    if (!session) {
      throw new NotFoundException('Sesion no encontrada');
    }
    return session;
  }

  private async findSessionForJoin(
    sessionId: string | undefined,
    roomCode: string,
  ) {
    if (sessionId) {
      try {
        return await this.findSessionOrFail(sessionId);
      } catch (error) {
        if (!(error instanceof NotFoundException)) {
          throw error;
        }
      }
    }

    const session = await this.sessionRepository.findOne({
      where: { roomCode: roomCode.trim().toUpperCase() },
      relations: [
        'quiz',
        'quiz.questions',
        'quiz.questions.options',
        'participants',
        'participants.user',
        'winner',
        'answers',
        'answers.participant',
        'answers.question',
        'answers.selectedOption',
      ],
      order: {
        quiz: { questions: { order: 'ASC', options: { order: 'ASC' } } },
        participants: { joinedAt: 'ASC' },
      },
    });

    if (!session) {
      throw new NotFoundException('Sesion no encontrada');
    }
    return session;
  }

  private getOrderedQuestions(questions: QuizQuestion[]) {
    return [...questions].sort((a, b) => a.order - b.order);
  }

  private isHostUser(session: QuizSession, userId: string | null) {
    return !!userId && !!session.host?.id && session.host.id === userId;
  }

  private async startQuestion(sessionId: string) {
    const session = await this.findSessionOrFail(sessionId);
    if (session.status !== QuizSessionStatus.IN_PROGRESS) {
      return;
    }

    const questions = this.getOrderedQuestions(session.quiz.questions);
    const question = questions[session.currentQuestionIndex];
    if (!question) {
      await this.finishSession(session.id);
      return;
    }

    const now = Date.now();
    const endsAt = new Date(now + session.secondsPerQuestion * 1000);

    session.currentQuestionEndsAt = endsAt;
    await this.sessionRepository.save(session);

    this.clearSessionRuntime(session.id);
    const runtime: SessionRuntime = {
      questionStartedAt: now,
      questionEndsAt: endsAt,
      closing: false,
    };
    runtime.timeout = setTimeout(() => {
      this.closeQuestion(session.id, false).catch((error) => {
        this.logger.error(error);
      });
    }, session.secondsPerQuestion * 1000);
    this.runtimeBySession.set(session.id, runtime);

    this.emitToSession(session.id, 'question.started', {
      sessionId: session.id,
      question: {
        id: question.id,
        prompt: question.prompt,
        order: question.order,
        totalQuestions: questions.length,
        options: question.options
          .sort((a, b) => a.order - b.order)
          .map((option) => ({
            id: option.id,
            text: option.text,
            order: option.order,
          })),
      },
      endsAt: endsAt.toISOString(),
    });
  }

  private async closeQuestion(sessionId: string, allAnswered: boolean) {
    const runtime = this.runtimeBySession.get(sessionId);
    if (runtime?.closing) {
      return;
    }
    if (runtime) {
      runtime.closing = true;
      if (runtime.timeout) {
        clearTimeout(runtime.timeout);
      }
    }

    const session = await this.findSessionOrFail(sessionId);
    if (session.status !== QuizSessionStatus.IN_PROGRESS) {
      return;
    }

    const questions = this.getOrderedQuestions(session.quiz.questions);
    const question = questions[session.currentQuestionIndex];
    if (!question) {
      await this.finishSession(session.id);
      return;
    }

    const correctOption = question.options.find((option) => option.isCorrect);
    const answers = await this.answerRepository.find({
      where: { session: { id: session.id }, question: { id: question.id } },
      relations: ['participant', 'participant.user', 'selectedOption'],
    });

    this.emitToSession(session.id, 'question.closed', {
      sessionId: session.id,
      questionId: question.id,
      correctOptionId: correctOption?.id ?? null,
      answeredUsers: answers.map((answer) => answer.participant.user.id),
      answeredCount: answers.length,
      participantCount: session.participants.length,
      allAnswered,
      answers: answers.map((answer) => ({
        userId: answer.participant.user.id,
        selectedOptionId: answer.selectedOption?.id ?? null,
        isCorrect: answer.isCorrect,
        points: answer.points,
        responseMs: answer.responseMs,
      })),
    });

    session.currentQuestionIndex += 1;
    session.currentQuestionEndsAt = null;
    await this.sessionRepository.save(session);

    this.runtimeBySession.delete(session.id);

    const hasNext = session.currentQuestionIndex < questions.length;
    if (hasNext) {
      setTimeout(() => {
        this.startQuestion(session.id).catch((error) =>
          this.logger.error(error),
        );
      }, 1000);
      return;
    }

    await this.finishSession(session.id);
  }

  private async finishSession(sessionId: string) {
    const session = await this.findSessionOrFail(sessionId);
    if (session.status === QuizSessionStatus.FINISHED) {
      return;
    }

    const ordered = [...session.participants].sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      if (a.totalResponseMs !== b.totalResponseMs) {
        return a.totalResponseMs - b.totalResponseMs;
      }
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });

    ordered.forEach((participant, index) => {
      participant.rank = index + 1;
      participant.isWinner = index === 0;
    });
    const winner = ordered.length > 0 ? ordered[0].user : null;
    await this.participantRepository.save(ordered);

    session.status = QuizSessionStatus.FINISHED;
    session.endedAt = new Date();
    session.currentQuestionEndsAt = null;
    session.winner = winner;
    await this.sessionRepository.save(session);
    this.clearSessionRuntime(session.id);

    this.emitToSession(session.id, 'session.finished', {
      sessionId: session.id,
      winner: winner
        ? {
            id: winner.id,
            name: winner.displayName || winner.fullName,
          }
        : null,
      ranking: ordered.map((participant) => ({
        userId: participant.user.id,
        name: participant.user.displayName || participant.user.fullName,
        score: participant.totalScore,
        totalResponseMs: participant.totalResponseMs,
        rank: participant.rank,
      })),
    });
  }

  private clearSessionRuntime(sessionId: string) {
    const runtime = this.runtimeBySession.get(sessionId);
    if (runtime?.timeout) {
      clearTimeout(runtime.timeout);
    }
    this.runtimeBySession.delete(sessionId);
  }

  private clearSessionSocketLinks(sessionId: string) {
    this.sessionUserSockets.delete(sessionId);
    for (const [socketId, sessions] of this.socketSessions.entries()) {
      sessions.delete(sessionId);
      if (sessions.size === 0) {
        this.socketSessions.delete(socketId);
      }
    }
  }

  private emitPresence(session: QuizSession) {
    this.emitToSession(session.id, 'session.presence.updated', {
      sessionId: session.id,
      participants: session.participants
        .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
        .map((participant) => ({
          id: participant.user.id,
          name: participant.user.displayName || participant.user.fullName,
          initial: (participant.user.displayName || participant.user.fullName)
            .charAt(0)
            .toUpperCase(),
          isConnected: participant.isConnected,
          score: participant.totalScore,
          rank: participant.rank,
        })),
    });
  }

  private buildSessionSnapshot(session: QuizSession, currentUserId: string) {
    const orderedQuestions = this.getOrderedQuestions(session.quiz.questions);
    const currentQuestion =
      session.currentQuestionIndex >= 0
        ? orderedQuestions[session.currentQuestionIndex]
        : null;

    return {
      sessionId: session.id,
      roomCode: session.roomCode,
      status: session.status,
      currentQuestionIndex: session.currentQuestionIndex,
      currentQuestionEndsAt: session.currentQuestionEndsAt
        ? session.currentQuestionEndsAt.toISOString()
        : null,
      quiz: {
        id: session.quiz.id,
        title: session.quiz.title,
        emoji: session.quiz.emoji,
        category: session.quiz.category,
        difficulty: session.quiz.difficulty,
        color: session.quiz.color,
        gradColors: session.quiz.gradColors,
        questionCount: orderedQuestions.length,
      },
      participants: session.participants
        .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
        .map((participant) => ({
          id: participant.user.id,
          name: participant.user.displayName || participant.user.fullName,
          initial: (participant.user.displayName || participant.user.fullName)
            .charAt(0)
            .toUpperCase(),
          isCurrentUser: participant.user.id === currentUserId,
          isConnected: participant.isConnected,
          score: participant.totalScore,
          rank: participant.rank,
        })),
      currentQuestion:
        session.status === QuizSessionStatus.IN_PROGRESS && currentQuestion
          ? {
              id: currentQuestion.id,
              prompt: currentQuestion.prompt,
              order: currentQuestion.order,
              totalQuestions: orderedQuestions.length,
              options: currentQuestion.options
                .sort((a, b) => a.order - b.order)
                .map((option) => ({
                  id: option.id,
                  text: option.text,
                  order: option.order,
                })),
            }
          : null,
      winner: session.winner
        ? {
            id: session.winner.id,
            name: session.winner.displayName || session.winner.fullName,
          }
        : null,
    };
  }

  private mapQuiz(quiz: Quiz) {
    const questions = this.getOrderedQuestions(quiz.questions).map(
      (question) => ({
        id: question.id,
        prompt: question.prompt,
        explanation: question.explanation,
        order: question.order,
        options: [...question.options]
          .sort((a, b) => a.order - b.order)
          .map((option) => ({
            id: option.id,
            text: option.text,
            order: option.order,
            isCorrect: option.isCorrect,
          })),
      }),
    );

    return {
      id: quiz.id,
      title: quiz.title,
      emoji: quiz.emoji,
      category: quiz.category,
      difficulty: quiz.difficulty,
      color: quiz.color,
      gradColors: quiz.gradColors,
      active: quiz.active,
      maxPlayers: quiz.maxPlayers,
      secondsPerQuestion: quiz.secondsPerQuestion,
      questionCount: questions.length,
      questions,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
    };
  }

  private mapSession(session: QuizSession) {
    return {
      id: session.id,
      roomCode: session.roomCode,
      status: session.status,
      currentQuestionIndex: session.currentQuestionIndex,
      currentQuestionEndsAt: session.currentQuestionEndsAt,
      maxPlayers: session.maxPlayers,
      secondsPerQuestion: session.secondsPerQuestion,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      quiz: {
        id: session.quiz.id,
        title: session.quiz.title,
        emoji: session.quiz.emoji,
        category: session.quiz.category,
        difficulty: session.quiz.difficulty,
      },
      host: session.host
        ? {
            id: session.host.id,
            fullName: session.host.fullName,
            displayName: session.host.displayName,
          }
        : null,
      winner: session.winner
        ? {
            id: session.winner.id,
            fullName: session.winner.fullName,
            displayName: session.winner.displayName,
          }
        : null,
      participantCount: session.participants?.length ?? 0,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  private mapSessionDetail(session: QuizSession) {
    const base = this.mapSession(session);
    return {
      ...base,
      participants: session.participants
        .sort((a, b) => {
          if ((a.rank ?? 99999) !== (b.rank ?? 99999)) {
            return (a.rank ?? 99999) - (b.rank ?? 99999);
          }
          return a.joinedAt.getTime() - b.joinedAt.getTime();
        })
        .map((participant) => ({
          id: participant.id,
          userId: participant.user.id,
          fullName: participant.user.fullName,
          displayName: participant.user.displayName,
          isConnected: participant.isConnected,
          totalScore: participant.totalScore,
          totalResponseMs: participant.totalResponseMs,
          rank: participant.rank,
          isWinner: participant.isWinner,
          joinedAt: participant.joinedAt,
        })),
    };
  }

  private emitToSession(sessionId: string, event: string, payload: unknown) {
    const room = this.getSessionRoom(sessionId);
    if (!this.io) {
      this.logger.warn(`Sin servidor io enlazado, no se emite ${event}`);
      return;
    }
    const ns = this.io as unknown as {
      adapter?: { rooms?: Map<string, Set<string>> };
      name?: string;
    };
    const clients = ns.adapter?.rooms?.get(room);
    this.logger.log(
      `-> emit ${event} ns=${ns.name ?? '?'} room=${room} sockets=${clients?.size ?? 0}`,
    );
    this.io.to(room).emit(event, payload);
  }

  private linkSocketToSessionUser(
    socketId: string,
    sessionId: string,
    userId: string,
  ) {
    if (!this.socketSessions.has(socketId)) {
      this.socketSessions.set(socketId, new Set<string>());
    }
    this.socketSessions.get(socketId)?.add(sessionId);

    if (!this.sessionUserSockets.has(sessionId)) {
      this.sessionUserSockets.set(sessionId, new Map<string, Set<string>>());
    }
    const userMap = this.sessionUserSockets.get(sessionId)!;
    if (!userMap.has(userId)) {
      userMap.set(userId, new Set<string>());
    }
    userMap.get(userId)?.add(socketId);
  }

  private unlinkSocketFromSessionUser(
    socketId: string,
    sessionId: string,
    userId: string,
  ) {
    this.socketSessions.get(socketId)?.delete(sessionId);
    if (this.socketSessions.get(socketId)?.size === 0) {
      this.socketSessions.delete(socketId);
    }

    const userMap = this.sessionUserSockets.get(sessionId);
    if (!userMap) {
      return;
    }
    const sockets = userMap.get(userId);
    if (!sockets) {
      return;
    }
    sockets.delete(socketId);
    if (sockets.size === 0) {
      userMap.delete(userId);
    }
    if (userMap.size === 0) {
      this.sessionUserSockets.delete(sessionId);
    }
  }

  private async syncParticipantConnection(sessionId: string, userId: string) {
    const participant = await this.participantRepository.findOne({
      where: { session: { id: sessionId }, user: { id: userId } },
      relations: ['session', 'user'],
    });
    if (!participant) {
      return;
    }

    const hasActiveSocket =
      this.sessionUserSockets.get(sessionId)?.get(userId)?.size ?? 0;
    participant.isConnected = hasActiveSocket > 0;
    participant.lastSeenAt = new Date();
    await this.participantRepository.save(participant);
  }

  private handleExceptions(error: unknown): never {
    this.logger.error(error);
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof ForbiddenException ||
      error instanceof ConflictException
    ) {
      throw error;
    }
    throw new InternalServerErrorException('Error al gestionar quiz');
  }
}

