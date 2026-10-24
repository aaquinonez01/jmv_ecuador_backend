import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import {
  ORIGENES_CONTACTO,
  type OrigenContacto,
} from '../entities/contact-message.entity';

export class FilterContactMessagesDto extends PaginationDto {
  @IsOptional()
  @IsIn(['true', 'false'])
  leido?: 'true' | 'false';

  @IsOptional()
  @IsIn(ORIGENES_CONTACTO)
  origen?: OrigenContacto;
}
