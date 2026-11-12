import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class SessionJoinDto {
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsString()
  @Length(4, 8)
  roomCode!: string;

  /** true desde la app: entra a jugar aunque sea quien creó la sala */
  @IsOptional()
  @IsBoolean()
  asPlayer?: boolean;
}

export class SessionLeaveDto {
  @IsUUID()
  sessionId!: string;
}

export class SessionHostActionDto {
  @IsUUID()
  sessionId!: string;
}

export class QuestionAnswerDto {
  /** Ms desde que la pregunta llegó al celular hasta que respondió (lo mide la app) */
  @IsOptional()
  @IsNumber()
  elapsedMs?: number;

  @IsUUID()
  sessionId!: string;

  @IsUUID()
  questionId!: string;

  @IsUUID()
  optionId!: string;
}
