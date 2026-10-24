import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateLeidoDto {
  // Si no se envía, se marca como leído
  @IsOptional()
  @IsBoolean()
  leido?: boolean;
}
