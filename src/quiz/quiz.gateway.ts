import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Socket, Server } from 'socket.io';
import { User } from 'src/auth/entities/user';
import { QuizService } from './quiz.service';
import {
  QuestionAnswerDto,
  SessionHostActionDto,
  SessionJoinDto,
  SessionLeaveDto,
} from './dto/socket-events.dto';

interface SocketWithUser extends Socket {
  data: {
    user?: User;
  };
}

interface JwtPayload {
  id: string;
}

@WebSocketGateway({
  namespace: 'quiz',
  cors: {
    origin: [
      'https://jmvecuador.org',
      'https://www.jmvecuador.org',
      'http://localhost:3000',
    ],
    credentials: true,
  },
})
export class QuizGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger('QuizGateway');

  constructor(
    private readonly quizService: QuizService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  afterInit(server: Server) {
    this.quizService.bindSocketServer(server);
    this.logger.log('Gateway de quiz inicializado');
  }

  async handleConnection(client: SocketWithUser) {
    try {
      const { user } = await this.requireSocketUser(client);
      this.logger.log(
        `socket conectado id=${client.id} user=${user.id} (${user.fullName})`,
      );
    } catch (error) {
      this.logger.warn(`Conexion rechazada: ${(error as Error)?.message}`);
      client.emit('session.error', { code: 'UNAUTHORIZED' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: SocketWithUser) {
    const userId = client.data.user?.id ?? null;
    this.logger.log(`socket desconectado id=${client.id} user=${userId}`);
    if (!userId) {
      return;
    }
    await this.quizService.disconnectSocket(client.id, userId);
  }

  @SubscribeMessage('session.join')
  async onSessionJoin(client: SocketWithUser, payload: SessionJoinDto) {
    this.logger.log(
      `<- session.join socket=${client.id} session=${payload.sessionId} code=${payload.roomCode}`,
    );
    try {
      const { user } = await this.requireSocketUser(client);
      const snapshot = await this.quizService.joinSession(
        user,
        payload.sessionId,
        payload.roomCode,
        client.id,
      );
      const room = this.quizService.getSessionRoom(snapshot.sessionId);
      await client.join(room);
      this.logger.log(
        `socket=${client.id} user=${user.id} unido al room ${room} (participants=${snapshot.participants.length})`,
      );
      client.emit('session.joined', snapshot);
      return snapshot;
    } catch (error) {
      const code = this.extractErrorCode(error);
      this.logger.warn(
        `session.join fallo socket=${client.id} session=${payload.sessionId} code=${code}`,
      );
      client.emit('session.error', { code, message: (error as Error).message });
      return { ok: false, code };
    }
  }

  @SubscribeMessage('session.leave')
  async onSessionLeave(client: SocketWithUser, payload: SessionLeaveDto) {
    this.logger.log(
      `<- session.leave socket=${client.id} session=${payload.sessionId}`,
    );
    try {
      const { userId } = await this.requireSocketUser(client);
      await client.leave(this.quizService.getSessionRoom(payload.sessionId));
      return await this.quizService.leaveSession(
        userId,
        payload.sessionId,
        client.id,
      );
    } catch (error) {
      const code = this.extractErrorCode(error);
      client.emit('session.error', { code, message: (error as Error).message });
      return { ok: false, code };
    }
  }

  @SubscribeMessage('session.host.start')
  async onHostStart(client: SocketWithUser, payload: SessionHostActionDto) {
    this.logger.log(
      `<- session.host.start socket=${client.id} session=${payload.sessionId}`,
    );
    try {
      const { userId } = await this.requireSocketUser(client);
      const result = await this.quizService.startSession(
        payload.sessionId,
        userId,
      );
      this.logger.log(
        `session.host.start OK session=${payload.sessionId} status=${result.status}`,
      );
      return result;
    } catch (error) {
      const code = this.extractErrorCode(error);
      this.logger.warn(
        `session.host.start fallo session=${payload.sessionId} code=${code}`,
      );
      client.emit('session.error', { code, message: (error as Error).message });
      return { ok: false, code };
    }
  }

  @SubscribeMessage('session.host.cancel')
  async onHostCancel(client: SocketWithUser, payload: SessionHostActionDto) {
    try {
      const { userId } = await this.requireSocketUser(client);
      return await this.quizService.cancelSession(payload.sessionId, userId);
    } catch (error) {
      const code = this.extractErrorCode(error);
      client.emit('session.error', { code, message: (error as Error).message });
      return { ok: false, code };
    }
  }

  @SubscribeMessage('question.answer')
  async onQuestionAnswer(client: SocketWithUser, payload: QuestionAnswerDto) {
    try {
      const { user } = await this.requireSocketUser(client);
      return await this.quizService.submitAnswer(
        user,
        payload.sessionId,
        payload.questionId,
        payload.optionId,
      );
    } catch (error) {
      const code = this.extractErrorCode(error);
      client.emit('session.error', { code, message: (error as Error).message });
      return { ok: false, code };
    }
  }

  private async requireSocketUser(client: SocketWithUser) {
    if (client.data.user?.id) {
      return { user: client.data.user, userId: client.data.user.id };
    }

    const token =
      this.getTokenFromSocket(client) ??
      this.getTokenFromHandshakeAuth(client.handshake.auth);

    if (!token) {
      throw new Error('UNAUTHORIZED');
    }

    const payload = this.jwtService.verify<JwtPayload>(token, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
    });

    if (typeof payload.id !== 'string' || !payload.id.trim()) {
      throw new Error('UNAUTHORIZED');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.id },
    });

    if (!user || !user.isActive || !user.id) {
      throw new Error('UNAUTHORIZED');
    }

    client.data.user = user;
    return { user, userId: user.id };
  }

  private getTokenFromSocket(client: SocketWithUser) {
    const headerValue = client.handshake.headers.authorization;
    const header = typeof headerValue === 'string' ? headerValue : '';
    if (!header.toLowerCase().startsWith('bearer ')) {
      return null;
    }
    return header.substring(7).trim();
  }

  private getTokenFromHandshakeAuth(auth: unknown) {
    if (!auth || typeof auth !== 'object' || !('token' in auth)) {
      return null;
    }

    const token = (auth as { token?: unknown }).token;
    if (typeof token !== 'string' || !token.trim()) {
      return null;
    }
    return token.trim();
  }

  private extractErrorCode(error: unknown) {
    const response =
      error && typeof error === 'object' && 'getResponse' in error
        ? (error as { getResponse: () => unknown }).getResponse()
        : null;

    if (
      response &&
      typeof response === 'object' &&
      'message' in response &&
      typeof response.message === 'string'
    ) {
      return response.message;
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'UNKNOWN_ERROR';
  }
}
