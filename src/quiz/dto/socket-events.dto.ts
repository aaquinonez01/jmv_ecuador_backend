import {
  IsBoolean,
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
  @IsUUID()
  sessionId!: string;

  @IsUUID()
  questionId!: string;

  @IsUUID()
  optionId!: string;
}
