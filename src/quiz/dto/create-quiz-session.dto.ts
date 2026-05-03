import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateQuizSessionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPlayers?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  secondsPerQuestion?: number;
}
