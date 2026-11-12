import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { monitorEventLoopDelay } from 'perf_hooks';
import { Server } from 'socket.io';
import { User } from 'src/auth/entities/user';
import { DataSource, Repository } from 'typeorm';
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
import { PointsService } from 'src/points/points.service';
import { QuizSessionStatus } from './interfaces/quiz-session-status.enum';

const SESSION_ROOM_PREFIX = 'quiz-session-';
/** Margen para respuestas que llegan justo al cierre (red móvil, servidor en Boston) */
const ANSWER_GRACE_MS = 1500;
/** Lo máximo que el tiempo que reporta la app puede "adelantarse" al del servidor */
const MAX_CLIENT_SKEW_MS = 2500;
const PRESENCE_THROTTLE_MS = 1000;
const PROGRESS_THROTTLE_MS = 500;
const NEXT_QUESTION_DELAY_MS = 1000;
const RESUME_DELAY_MS = 5000;
const LIVE_TTL_AFTER_END_MS = Number(
  process.env.QUIZ_LIVE_TTL_MS ?? 10 * 60 * 1000,
);
const DEFAULT_MAX_PLAYERS = 300;

interface LiveOption {
  id: string;
  text: string;
  order: number;
  isCorrect: boolean;
}

interface LiveQuestion {
  id: string;
  prompt: string;
  order: number;
  options: LiveOption[];
}

interface LiveParticipant {
  id: string;
  userId: string;
  name: string;
  initial: string;
  joinedAt: number;
  isConnected: boolean;
  totalScore: number;
  totalResponseMs: number;
  rank: number | null;
  isWinner: boolean;
}

interface LiveAnswer {
  participantId: string;
  userId: string;
  optionId: string;
  isCorrect: boolean;
  responseMs: number;
  points: number;
  answeredAt: Date;
}

interface LiveQuestionState {
  id: string;
  startedAt: number;
  endsAt: number;
  closing: boolean;
  timeout?: NodeJS.Timeout;
  answers: Map<string, LiveAnswer>;
}

interface LiveSession {
  id: string;
  roomCode: string;
  status: QuizSessionStatus;
  hostId: string | null;
  quiz: {
    id: string;
    title: string;
    emoji: string | null;
    category: string;
    difficulty: string;
    color: string | null;
    gradColors: string[];
  };
  questions: LiveQuestion[];
  currentQuestionIndex: number;
  secondsPerQuestion: number;
  maxPlayers: number;
  currentQuestionEndsAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  winner: { id: string; name: string } | null;
  participants: Map<string, LiveParticipant>;
  question: LiveQuestionState | null;
  lock: Promise<unknown>;
  nextTimer?: NodeJS.Timeout;
  disposeTimer?: NodeJS.Timeout;
  lastEmit: Map<string, number>;
  throttleTimers: Map<string, NodeJS.Timeout>;
}

@Injectable()
export class QuizService implements OnApplicationBootstrap {
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
    private readonly pointsService: PointsService,
    private readonly dataSource: DataSource,
  ) {
    this.loopDelay.enable();
  }

  private readonly logger = new Logger('QuizService');
  private io: Server | null = null;
  /** Salas en juego, en memoria */
  private readonly liveSessions = new Map<string, LiveSession>();
  private readonly liveLoading = new Map<string, Promise<LiveSession>>();
  private readonly socketSessions = new Map<string, Set<string>>();
  private readonly sessionUserSockets = new Map<
    string,
    Map<string, Set<string>>
  >();
  private readonly answerTimes: number[] = [];
  private readonly loopDelay = monitorEventLoopDelay({ resolution: 20 });
  private metricsTimer?: NodeJS.Timeout;

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
      // Por defecto caben hasta 300 (antes 50): un encuentro nacional entra en una sala
      maxPlayers:
        dto.maxPlayers ?? Math.max(quiz.maxPlayers, DEFAULT_MAX_PLAYERS),
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
      loadEagerRelations: false,
      relations: ['quiz', 'quiz.questions', 'participants'],
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

  // ══════════════════════════════════════════════════════════════════════════
  // Juego en vivo: el estado de cada sala vive en memoria mientras se juega.
  // La base de datos solo guarda, por lotes, al cerrar cada pregunta y al final.
  // ══════════════════════════════════════════════════════════════════════════

  async onApplicationBootstrap() {
    // Si el servidor se reinició a mitad de un quiz, retoma la pregunta en curso
    try {
      const rows: { id: string }[] = await this.sessionRepository
        .createQueryBuilder('session')
        .select('session.id', 'id')
        .where('session.status = :status', {
          status: QuizSessionStatus.IN_PROGRESS,
        })
        .getRawMany();
      for (const row of rows) {
        const live = await this.getLive(row.id);
        this.logger.warn(
          `Retomando la sala ${live.roomCode} en la pregunta ${live.currentQuestionIndex + 1}`,
        );
        live.nextTimer = setTimeout(() => {
          void this.withLock(live, () => this.startQuestion(live));
        }, RESUME_DELAY_MS);
      }
    } catch (error) {
      this.logger.error('No se pudieron retomar las salas en curso', error);
    }
    this.metricsTimer = setInterval(() => this.logMetricsIfBusy(), 30_000);
    this.metricsTimer.unref();
  }

  /** Indicadores para vigilar la carga (solo administradores) */
  getMetrics() {
    const lag = this.loopDelay;
    const result = {
      liveSessions: this.liveSessions.size,
      inProgress: [...this.liveSessions.values()].filter(
        (live) => live.status === QuizSessionStatus.IN_PROGRESS,
      ).length,
      players: [...this.liveSessions.values()].reduce(
        (total, live) => total + live.participants.size,
        0,
      ),
      connectedPlayers: [...this.liveSessions.values()].reduce(
        (total, live) =>
          total +
          [...live.participants.values()].filter((p) => p.isConnected).length,
        0,
      ),
      sockets: this.socketSessions.size,
      answersLastMinute: this.answerTimes.filter(
        (time) => time > Date.now() - 60_000,
      ).length,
      eventLoopLagMs: {
        p50: Math.round(lag.percentile(50) / 1e6),
        p99: Math.round(lag.percentile(99) / 1e6),
        max: Math.round(lag.max / 1e6),
      },
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    };
    lag.reset();
    return result;
  }

  private logMetricsIfBusy() {
    if (this.liveSessions.size === 0) return;
    this.logger.log(`métricas ${JSON.stringify(this.getMetrics())}`);
  }

  private withLock<T>(live: LiveSession, fn: () => Promise<T>): Promise<T> {
    const run = live.lock.then(fn, fn);
    live.lock = run.catch(() => undefined);
    return run;
  }

  /** Sala en memoria (se carga una sola vez desde la base) */
  private async getLive(sessionId: string): Promise<LiveSession> {
    const cached = this.liveSessions.get(sessionId);
    if (cached) return cached;
    const loading = this.liveLoading.get(sessionId);
    if (loading) return loading;
    const promise = (async () => {
      const session = await this.findSessionOrFail(sessionId);
      const live = this.buildLive(session);
      this.liveSessions.set(sessionId, live);
      return live;
    })();
    this.liveLoading.set(sessionId, promise);
    try {
      return await promise;
    } finally {
      this.liveLoading.delete(sessionId);
    }
  }

  private buildLive(session: QuizSession): LiveSession {
    const questions = this.getOrderedQuestions(session.quiz.questions).map(
      (question) => ({
        id: question.id,
        prompt: question.prompt,
        order: question.order,
        options: [...question.options]
          .sort((a, b) => a.order - b.order)
          .map((option) => ({
            id: option.id,
            text: option.text,
            order: option.order,
            isCorrect: !!option.isCorrect,
          })),
      }),
    );
    const participants = new Map<string, LiveParticipant>();
    for (const participant of session.participants) {
      const name = participant.user.displayName || participant.user.fullName;
      participants.set(participant.user.id!, {
        id: participant.id,
        userId: participant.user.id!,
        name,
        initial: name.charAt(0).toUpperCase(),
        joinedAt: participant.joinedAt.getTime(),
        // Nadie está conectado hasta que su socket se une a la sala
        isConnected: false,
        totalScore: participant.totalScore,
        totalResponseMs: participant.totalResponseMs,
        rank: participant.rank ?? null,
        isWinner: participant.isWinner,
      });
    }
    const live: LiveSession = {
      id: session.id,
      roomCode: session.roomCode,
      status: session.status,
      hostId: session.host?.id ?? null,
      quiz: {
        id: session.quiz.id,
        title: session.quiz.title,
        emoji: session.quiz.emoji ?? null,
        category: session.quiz.category,
        difficulty: session.quiz.difficulty,
        color: session.quiz.color ?? null,
        gradColors: session.quiz.gradColors,
      },
      questions,
      currentQuestionIndex: session.currentQuestionIndex,
      secondsPerQuestion: session.secondsPerQuestion,
      maxPlayers: session.maxPlayers,
      currentQuestionEndsAt: null,
      startedAt: session.startedAt ?? null,
      endedAt: session.endedAt ?? null,
      winner: session.winner
        ? {
            id: session.winner.id!,
            name: session.winner.displayName || session.winner.fullName,
          }
        : null,
      participants,
      question: null,
      lock: Promise.resolve(),
      lastEmit: new Map(),
      throttleTimers: new Map(),
    };
    if (
      live.status === QuizSessionStatus.FINISHED ||
      live.status === QuizSessionStatus.CANCELLED
    ) {
      this.scheduleDispose(live);
    }
    return live;
  }

  private scheduleDispose(live: LiveSession) {
    if (live.disposeTimer) clearTimeout(live.disposeTimer);
    live.disposeTimer = setTimeout(
      () => this.disposeLive(live.id),
      LIVE_TTL_AFTER_END_MS,
    );
    live.disposeTimer.unref?.();
  }

  private disposeLive(sessionId: string) {
    const live = this.liveSessions.get(sessionId);
    if (!live) return;
    this.clearLiveTimers(live);
    if (live.disposeTimer) clearTimeout(live.disposeTimer);
    this.liveSessions.delete(sessionId);
    this.clearSessionSocketLinks(sessionId);
  }

  private clearLiveTimers(live: LiveSession) {
    if (live.question?.timeout) clearTimeout(live.question.timeout);
    if (live.nextTimer) clearTimeout(live.nextTimer);
    for (const timer of live.throttleTimers.values()) clearTimeout(timer);
    live.throttleTimers.clear();
  }

  /** Ejecuta `fn` como máximo una vez cada `ms` (al instante si hace rato que no se emite) */
  private throttled(
    live: LiveSession,
    key: string,
    ms: number,
    fn: () => void,
  ) {
    if (live.throttleTimers.has(key)) return;
    const wait = Math.max(0, (live.lastEmit.get(key) ?? 0) + ms - Date.now());
    const run = () => {
      live.throttleTimers.delete(key);
      live.lastEmit.set(key, Date.now());
      fn();
    };
    if (wait === 0) {
      run();
      return;
    }
    live.throttleTimers.set(key, setTimeout(run, wait));
  }

  private schedulePresence(live: LiveSession) {
    this.throttled(live, 'presence', PRESENCE_THROTTLE_MS, () =>
      this.emitPresence(live),
    );
  }

  private scheduleProgress(live: LiveSession) {
    this.throttled(live, 'progress', PROGRESS_THROTTLE_MS, () => {
      if (!live.question) return;
      this.emitToSession(
        live.id,
        'question.progress',
        {
          sessionId: live.id,
          questionId: live.question.id,
          answeredCount: live.question.answers.size,
          participantCount: live.participants.size,
        },
        true,
      );
    });
  }

  private orderedParticipants(live: LiveSession) {
    return [...live.participants.values()].sort(
      (a, b) => a.joinedAt - b.joinedAt,
    );
  }

  private publicParticipant(p: LiveParticipant) {
    return {
      id: p.userId,
      name: p.name,
      initial: p.initial,
      isConnected: p.isConnected,
      score: p.totalScore,
      rank: p.rank,
    };
  }

  private emitPresence(live: LiveSession) {
    this.emitToSession(
      live.id,
      'session.presence.updated',
      {
        sessionId: live.id,
        participants: this.orderedParticipants(live).map((p) =>
          this.publicParticipant(p),
        ),
      },
      true,
    );
  }

  private buildLiveSnapshot(live: LiveSession, currentUserId: string) {
    const current =
      live.status === QuizSessionStatus.IN_PROGRESS && live.question
        ? live.questions[live.currentQuestionIndex]
        : null;
    const myAnswer = live.question?.answers.get(currentUserId) ?? null;
    return {
      sessionId: live.id,
      roomCode: live.roomCode,
      status: live.status,
      currentQuestionIndex: live.currentQuestionIndex,
      currentQuestionEndsAt: live.currentQuestionEndsAt
        ? live.currentQuestionEndsAt.toISOString()
        : null,
      /** Hora del servidor: la app calcula la diferencia con su reloj */
      serverNow: Date.now(),
      quiz: { ...live.quiz, questionCount: live.questions.length },
      participants: this.orderedParticipants(live).map((p) => ({
        ...this.publicParticipant(p),
        isCurrentUser: p.userId === currentUserId,
      })),
      currentQuestion: current
        ? {
            id: current.id,
            prompt: current.prompt,
            order: current.order,
            totalQuestions: live.questions.length,
            options: current.options.map(({ id, text, order }) => ({
              id,
              text,
              order,
            })),
          }
        : null,
      /** Si ya respondió la pregunta en curso (al reconectarse) */
      myAnswer: myAnswer
        ? {
            questionId: live.question!.id,
            optionId: myAnswer.optionId,
            points: myAnswer.points,
            isCorrect: myAnswer.isCorrect,
          }
        : null,
      winner: live.winner,
    };
  }

  // ── Sesiones ────────────────────────────────────────────────────────────

  async getSessionState(sessionId: string, user: User) {
    const live = await this.getLive(sessionId);
    const isHost = live.hostId === user.id;
    if (
      !live.participants.has(user.id!) &&
      !isHost &&
      live.status !== QuizSessionStatus.WAITING
    ) {
      throw new ForbiddenException('No perteneces a esta sesión');
    }
    return this.buildLiveSnapshot(live, user.id!);
  }

  async startSession(sessionId: string, hostUserId: string) {
    const live = await this.getLive(sessionId);
    await this.withLock(live, async () => {
      if (live.hostId !== hostUserId) {
        throw new ForbiddenException('Solo el host puede iniciar la sesión');
      }
      if (live.status !== QuizSessionStatus.WAITING) {
        throw new BadRequestException('La sesión no está en espera');
      }
      if (!live.participants.size) {
        throw new BadRequestException('No hay participantes en la sesión');
      }
      live.status = QuizSessionStatus.IN_PROGRESS;
      live.startedAt = new Date();
      live.currentQuestionIndex = 0;
      await this.sessionRepository.update(live.id, {
        status: live.status,
        startedAt: live.startedAt,
        currentQuestionIndex: 0,
      });
      this.emitToSession(live.id, 'session.started', {
        sessionId: live.id,
        startedAt: live.startedAt.toISOString(),
      });
      await this.startQuestion(live);
    });
    return this.mapSession(await this.findSessionOrFail(sessionId));
  }

  async cancelSession(sessionId: string, hostUserId: string) {
    const live = await this.getLive(sessionId);
    await this.withLock(live, async () => {
      if (live.hostId !== hostUserId) {
        throw new ForbiddenException('Solo el host puede cancelar la sesión');
      }
      if (
        live.status === QuizSessionStatus.CANCELLED ||
        live.status === QuizSessionStatus.FINISHED
      ) {
        return;
      }
      this.clearLiveTimers(live);
      live.question = null;
      live.status = QuizSessionStatus.CANCELLED;
      live.endedAt = new Date();
      live.currentQuestionEndsAt = null;
      await this.sessionRepository.update(live.id, {
        status: live.status,
        endedAt: live.endedAt,
        currentQuestionEndsAt: null,
      });
      this.emitToSession(live.id, 'session.cancelled', {
        sessionId: live.id,
        endedAt: live.endedAt.toISOString(),
      });
      this.scheduleDispose(live);
    });
    return this.mapSession(await this.findSessionOrFail(sessionId));
  }

  /** Limpieza de la prueba de estrés: solo cuentas y quizzes con su marca exacta */
  async removeStressData() {
    // DELETE dentro de un WITH: postgres devuelve el conteo como un SELECT normal
    return this.dataSource.transaction(async (manager) => {
      const [quizzes] = await manager.query<{ n: number }[]>(
        String.raw`WITH d AS (DELETE FROM "quizzes" WHERE "title" LIKE '[PRUEBA DE ESTRÉS]%' RETURNING 1)
         SELECT count(*)::int AS n FROM d`,
      );
      const [users] = await manager.query<{ n: number }[]>(
        String.raw`WITH d AS (DELETE FROM "user" WHERE "email" ~ '^estres-[0-9]{3}@prueba\.jmvecuador\.org$' RETURNING 1)
         SELECT count(*)::int AS n FROM d`,
      );
      this.logger.log(
        `Limpieza de estrés: ${users.n} cuentas y ${quizzes.n} quizzes borrados`,
      );
      return { cuentas: users.n, quizzes: quizzes.n };
    });
  }

  async removeSession(sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      select: { id: true, status: true },
      loadEagerRelations: false,
    });
    if (!session) throw new NotFoundException('Sesion no encontrada');
    const live = this.liveSessions.get(sessionId);
    if (
      session.status === QuizSessionStatus.IN_PROGRESS ||
      live?.status === QuizSessionStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        'No se puede eliminar una sesión en progreso. Cancélala primero.',
      );
    }
    this.emitToSession(sessionId, 'session.deleted', { sessionId });
    this.disposeLive(sessionId);
    await this.sessionRepository.delete({ id: sessionId });
    return { message: 'Sesión eliminada correctamente', id: sessionId };
  }

  private async sessionIdByCode(roomCode: string) {
    const row = await this.sessionRepository.findOne({
      where: { roomCode: roomCode.trim().toUpperCase() },
      select: { id: true },
      loadEagerRelations: false,
    });
    if (!row) throw new NotFoundException('Sesion no encontrada');
    return row.id;
  }

  async joinSession(
    user: User,
    sessionId: string | undefined,
    roomCode: string,
    socketId?: string,
    asPlayer = false,
  ) {
    let live: LiveSession;
    try {
      live = await this.getLive(
        sessionId ?? (await this.sessionIdByCode(roomCode)),
      );
    } catch (error) {
      if (!(error instanceof NotFoundException) || !sessionId) throw error;
      live = await this.getLive(await this.sessionIdByCode(roomCode));
    }

    return this.withLock(live, async () => {
      // Quien creó la sala es anfitrión (la maneja desde la web); si entra desde la app, juega
      const isHost = live.hostId === user.id && !asPlayer;
      if (live.roomCode.toUpperCase() !== roomCode.trim().toUpperCase()) {
        throw new BadRequestException('INVALID_CODE');
      }
      if (
        live.status === QuizSessionStatus.CANCELLED ||
        live.status === QuizSessionStatus.FINISHED
      ) {
        throw new BadRequestException('SESSION_NOT_JOINABLE');
      }

      let participant = live.participants.get(user.id!);
      if (
        live.status === QuizSessionStatus.IN_PROGRESS &&
        !participant &&
        !isHost
      ) {
        throw new ForbiddenException('LATE_JOIN_NOT_ALLOWED');
      }

      if (!participant && !isHost) {
        if (live.participants.size >= live.maxPlayers) {
          throw new ConflictException('ROOM_FULL');
        }
        const now = new Date();
        const result = await this.participantRepository.insert({
          session: { id: live.id },
          user: { id: user.id! },
          isConnected: true,
          joinedAt: now,
          lastSeenAt: now,
          totalScore: 0,
          totalResponseMs: 0,
        });
        const name = user.displayName || user.fullName;
        participant = {
          id: (result.identifiers[0] as { id: string }).id,
          userId: user.id!,
          name,
          initial: name.charAt(0).toUpperCase(),
          joinedAt: now.getTime(),
          isConnected: true,
          totalScore: 0,
          totalResponseMs: 0,
          rank: null,
          isWinner: false,
        };
        live.participants.set(user.id!, participant);
      }

      if (socketId) {
        this.linkSocketToSessionUser(socketId, live.id, user.id!);
      }
      if (participant) participant.isConnected = true;
      this.schedulePresence(live);
      return this.buildLiveSnapshot(live, user.id!);
    });
  }

  leaveSession(userId: string, sessionId: string, socketId?: string) {
    if (socketId) {
      this.unlinkSocketFromSessionUser(socketId, sessionId, userId);
    }
    this.refreshConnection(sessionId, userId);
    return Promise.resolve({ message: 'Sesión abandonada' });
  }

  disconnectSocket(socketId: string, userId: string) {
    const sessions = this.socketSessions.get(socketId);
    if (!sessions) return Promise.resolve();
    for (const sessionId of [...sessions]) {
      this.unlinkSocketFromSessionUser(socketId, sessionId, userId);
      this.refreshConnection(sessionId, userId);
    }
    return Promise.resolve();
  }

  /** Reconexión corta recuperada por socket.io: el socket vuelve a su sala */
  relinkSocket(socketId: string, sessionId: string, userId: string) {
    const live = this.liveSessions.get(sessionId);
    if (!live) return;
    this.linkSocketToSessionUser(socketId, sessionId, userId);
    this.refreshConnection(sessionId, userId);
  }

  private refreshConnection(sessionId: string, userId: string) {
    const live = this.liveSessions.get(sessionId);
    const participant = live?.participants.get(userId);
    if (!live || !participant) return;
    const connected =
      (this.sessionUserSockets.get(sessionId)?.get(userId)?.size ?? 0) > 0;
    if (participant.isConnected !== connected) {
      participant.isConnected = connected;
      this.schedulePresence(live);
    }
  }

  // ── Preguntas ───────────────────────────────────────────────────────────

  private async startQuestion(live: LiveSession) {
    if (live.status !== QuizSessionStatus.IN_PROGRESS) return;
    const question = live.questions[live.currentQuestionIndex];
    if (!question) {
      await this.finishSession(live);
      return;
    }
    const now = Date.now();
    const durationMs = live.secondsPerQuestion * 1000;
    const endsAt = new Date(now + durationMs);
    live.currentQuestionEndsAt = endsAt;
    live.question = {
      id: question.id,
      startedAt: now,
      endsAt: endsAt.getTime(),
      closing: false,
      answers: new Map(),
    };
    live.question.timeout = setTimeout(() => {
      this.closeQuestion(live, false).catch((error) =>
        this.logger.error(error),
      );
    }, durationMs);

    // Punto de guardado liviano (no bloquea la pregunta)
    this.sessionRepository
      .update(live.id, {
        currentQuestionIndex: live.currentQuestionIndex,
        currentQuestionEndsAt: endsAt,
      })
      .catch((error) => this.logger.error(error));

    this.emitToSession(live.id, 'question.started', {
      sessionId: live.id,
      question: {
        id: question.id,
        prompt: question.prompt,
        order: question.order,
        totalQuestions: live.questions.length,
        options: question.options.map(({ id, text, order }) => ({
          id,
          text,
          order,
        })),
      },
      endsAt: endsAt.toISOString(),
      serverNow: now,
      durationMs,
    });
  }

  async submitAnswer(
    user: User,
    sessionId: string,
    questionId: string,
    optionId: string,
    clientElapsedMs?: unknown,
  ) {
    const live = await this.getLive(sessionId);
    if (live.status !== QuizSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('SESSION_NOT_ACTIVE');
    }
    const participant = live.participants.get(user.id!);
    if (!participant) {
      throw new ForbiddenException('NOT_IN_SESSION');
    }
    const state = live.question;
    if (!state || state.id !== questionId || state.closing) {
      throw new BadRequestException('QUESTION_NOT_ACTIVE');
    }

    // Reintento de la app (no llegó la confirmación): misma respuesta, mismo resultado
    const previous = state.answers.get(user.id!);
    if (previous) {
      if (previous.optionId === optionId) {
        return {
          questionId,
          points: previous.points,
          isCorrect: previous.isCorrect,
          responseMs: previous.responseMs,
        };
      }
      throw new ConflictException('ALREADY_ANSWERED');
    }

    const now = Date.now();
    if (now > state.endsAt + ANSWER_GRACE_MS) {
      throw new BadRequestException('QUESTION_CLOSED');
    }
    const question = live.questions[live.currentQuestionIndex];
    const option = question?.options.find((item) => item.id === optionId);
    if (!question || !option) {
      throw new BadRequestException('INVALID_OPTION');
    }

    // Rapidez justa: desde que la pregunta llegó al celular (lo que reporta la app),
    // sin que pueda "adelantarse" más de MAX_CLIENT_SKEW_MS respecto al servidor
    const durationMs = live.secondsPerQuestion * 1000;
    const serverElapsed = now - state.startedAt;
    let responseMs = serverElapsed;
    if (
      typeof clientElapsedMs === 'number' &&
      Number.isFinite(clientElapsedMs) &&
      clientElapsedMs >= 0
    ) {
      responseMs = Math.min(
        serverElapsed,
        Math.max(clientElapsedMs, serverElapsed - MAX_CLIENT_SKEW_MS),
      );
    }
    responseMs = Math.round(Math.min(Math.max(responseMs, 0), durationMs));

    const isCorrect = option.isCorrect;
    const bonus = isCorrect
      ? Math.round(((durationMs - responseMs) / durationMs) * 50)
      : 0;
    const points = isCorrect ? 100 + bonus : 0;

    state.answers.set(user.id!, {
      participantId: participant.id,
      userId: user.id!,
      optionId,
      isCorrect,
      responseMs,
      points,
      answeredAt: new Date(now),
    });
    participant.totalScore += points;
    participant.totalResponseMs += responseMs;
    this.answerTimes.push(now);
    if (this.answerTimes.length > 5000) this.answerTimes.splice(0, 2500);

    this.scheduleProgress(live);
    if (state.answers.size >= live.participants.size) {
      this.closeQuestion(live, true).catch((error) => this.logger.error(error));
    }

    return { questionId, points, isCorrect, responseMs };
  }

  private async closeQuestion(live: LiveSession, allAnswered: boolean) {
    const state = live.question;
    if (!state || state.closing) return;
    state.closing = true;
    if (state.timeout) clearTimeout(state.timeout);

    await this.withLock(live, async () => {
      if (live.status !== QuizSessionStatus.IN_PROGRESS) return;
      const question = live.questions[live.currentQuestionIndex];
      if (!question) {
        await this.finishSession(live);
        return;
      }
      const answers = [...state.answers.values()];
      const correct = question.options.find((option) => option.isCorrect);

      live.currentQuestionIndex += 1;
      live.question = null;
      live.currentQuestionEndsAt = null;

      // Guardado por lotes: respuestas + puntajes + punto de guardado, en una transacción
      await this.persistQuestion(live, question.id, answers).catch((error) =>
        this.logger.error(
          `No se pudo guardar la pregunta ${question.id} de la sala ${live.roomCode}`,
          error,
        ),
      );

      this.emitQuestionClosed(
        live,
        question.id,
        correct?.id ?? null,
        answers,
        allAnswered,
      );

      if (live.currentQuestionIndex < live.questions.length) {
        live.nextTimer = setTimeout(() => {
          void this.withLock(live, () => this.startQuestion(live)).catch(
            (error) => this.logger.error(error),
          );
        }, NEXT_QUESTION_DELAY_MS);
        return;
      }
      await this.finishSession(live);
    });
  }

  /**
   * Cierre de pregunta: cada celular recibe solo su respuesta (unos cientos de bytes);
   * el panel del anfitrión (y cualquier socket no identificado) recibe la lista completa.
   */
  private emitQuestionClosed(
    live: LiveSession,
    questionId: string,
    correctOptionId: string | null,
    answers: LiveAnswer[],
    allAnswered: boolean,
  ) {
    if (!this.io) return;
    const toPublic = (answer: LiveAnswer) => ({
      userId: answer.userId,
      selectedOptionId: answer.optionId,
      isCorrect: answer.isCorrect,
      points: answer.points,
      responseMs: answer.responseMs,
    });
    const base = {
      sessionId: live.id,
      questionId,
      correctOptionId,
      answeredCount: answers.length,
      participantCount: live.participants.size,
      allAnswered,
    };
    const byUser = new Map(answers.map((answer) => [answer.userId, answer]));
    const playerSockets: string[] = [];
    const users = this.sessionUserSockets.get(live.id);
    for (const [userId, sockets] of users ?? []) {
      if (userId === live.hostId || !live.participants.has(userId)) continue;
      const mine = byUser.get(userId);
      const payload = {
        ...base,
        answeredUsers: mine ? [userId] : [],
        answers: mine ? [toPublic(mine)] : [],
      };
      for (const socketId of sockets) {
        playerSockets.push(socketId);
        this.io.to(socketId).emit('question.closed', payload);
      }
    }
    this.io
      .to(this.getSessionRoom(live.id))
      .except(playerSockets)
      .emit('question.closed', {
        ...base,
        answeredUsers: answers.map((answer) => answer.userId),
        answers: answers.map(toPublic),
      });
    this.logger.log(
      `-> question.closed sala=${live.roomCode} ${answers.length}/${live.participants.size} (personalizado a ${playerSockets.length} celulares)`,
    );
  }

  private async persistQuestion(
    live: LiveSession,
    questionId: string,
    answers: LiveAnswer[],
  ) {
    await this.dataSource.transaction(async (manager) => {
      if (answers.length) {
        await manager.insert(
          QuizSessionAnswer,
          answers.map((answer) => ({
            session: { id: live.id },
            participant: { id: answer.participantId },
            question: { id: questionId },
            selectedOption: { id: answer.optionId },
            isCorrect: answer.isCorrect,
            responseMs: answer.responseMs,
            points: answer.points,
            answeredAt: answer.answeredAt,
          })),
        );
        const touched = answers
          .map((answer) => live.participants.get(answer.userId))
          .filter((p): p is LiveParticipant => !!p);
        await manager.query(
          `UPDATE quiz_session_participants p
           SET "totalScore" = v.score, "totalResponseMs" = v.ms, "lastSeenAt" = now()
           FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::int[]) AS score, unnest($3::int[]) AS ms) v
           WHERE p.id = v.id`,
          [
            touched.map((p) => p.id),
            touched.map((p) => p.totalScore),
            touched.map((p) => p.totalResponseMs),
          ],
        );
      }
      await manager.update(QuizSession, live.id, {
        currentQuestionIndex: live.currentQuestionIndex,
        currentQuestionEndsAt: null,
      });
    });
  }

  private async finishSession(live: LiveSession) {
    if (live.status === QuizSessionStatus.FINISHED) return;
    this.clearLiveTimers(live);
    live.question = null;

    const ordered = [...live.participants.values()].sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (a.totalResponseMs !== b.totalResponseMs) {
        return a.totalResponseMs - b.totalResponseMs;
      }
      return a.joinedAt - b.joinedAt;
    });
    ordered.forEach((participant, index) => {
      participant.rank = index + 1;
      participant.isWinner = index === 0;
    });
    const winner = ordered[0] ?? null;

    live.status = QuizSessionStatus.FINISHED;
    live.endedAt = new Date();
    live.currentQuestionEndsAt = null;
    live.winner = winner ? { id: winner.userId, name: winner.name } : null;

    try {
      await this.dataSource.transaction(async (manager) => {
        if (ordered.length) {
          await manager.query(
            `UPDATE quiz_session_participants p
             SET rank = v.rank, "isWinner" = v.win, "isConnected" = v.conn,
                 "totalScore" = v.score, "totalResponseMs" = v.ms
             FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::int[]) AS rank,
                          unnest($3::bool[]) AS win, unnest($4::bool[]) AS conn,
                          unnest($5::int[]) AS score, unnest($6::int[]) AS ms) v
             WHERE p.id = v.id`,
            [
              ordered.map((p) => p.id),
              ordered.map((p) => p.rank),
              ordered.map((p) => p.isWinner),
              ordered.map((p) => p.isConnected),
              ordered.map((p) => p.totalScore),
              ordered.map((p) => p.totalResponseMs),
            ],
          );
        }
        await manager.update(QuizSession, live.id, {
          status: live.status,
          endedAt: live.endedAt,
          currentQuestionEndsAt: null,
          winner: winner ? { id: winner.userId } : null,
        });
      });
    } catch (error) {
      this.logger.error(`No se pudo cerrar la sala ${live.roomCode}`, error);
    }

    // Puntos JMV: participación + podio (con tope diario); nunca rompe el cierre.
    // El anfitrión puede jugar su propia sala, pero no suma puntos (ve las preguntas).
    const points = await this.pointsService.awardQuizSession(
      live.id,
      live.quiz.title,
      ordered
        .filter((participant) => participant.userId !== live.hostId)
        .map((participant) => ({ userId: participant.userId })),
    );

    this.emitToSession(live.id, 'session.finished', {
      sessionId: live.id,
      winner: live.winner,
      ranking: ordered.map((participant) => ({
        userId: participant.userId,
        name: participant.name,
        score: participant.totalScore,
        totalResponseMs: participant.totalResponseMs,
        rank: participant.rank,
        pointsAwarded: points.get(participant.userId) ?? 0,
      })),
    });
    this.scheduleDispose(live);
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

  private emitToSession(
    sessionId: string,
    event: string,
    payload: unknown,
    frequent = false,
  ) {
    const room = this.getSessionRoom(sessionId);
    if (!this.io) {
      this.logger.warn(`Sin servidor io enlazado, no se emite ${event}`);
      return;
    }
    if (!frequent) {
      const ns = this.io as unknown as {
        adapter?: { rooms?: Map<string, Set<string>> };
      };
      const clients = ns.adapter?.rooms?.get(room);
      this.logger.log(`-> ${event} room=${room} sockets=${clients?.size ?? 0}`);
    }
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
    const sockets = userMap?.get(userId);
    if (!userMap || !sockets) return;
    sockets.delete(socketId);
    if (sockets.size === 0) userMap.delete(userId);
    if (userMap.size === 0) this.sessionUserSockets.delete(sessionId);
  }

  // ── Consultas a la base (fuera del juego) ───────────────────────────────

  /** Sala con quiz, preguntas y jugadores (sin respuestas: nunca se cargan en bloque) */
  private async findSessionOrFail(sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      loadEagerRelations: false,
      relations: [
        'quiz',
        'quiz.questions',
        'quiz.questions.options',
        'host',
        'participants',
        'participants.user',
        'winner',
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
        select: { id: true },
        loadEagerRelations: false,
      });
      if (!exists) {
        return code;
      }
    }
    throw new InternalServerErrorException(
      'No se pudo generar cÃ³digo de sala',
    );
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
