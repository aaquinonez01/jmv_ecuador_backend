import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { RealIpThrottlerGuard } from 'src/common/guards/real-ip-throttler.guard';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { FilterContactMessagesDto } from './dto/filter-contact-messages.dto';
import { UpdateLeidoDto } from './dto/update-leido.dto';
import { ContactMessagesService } from './contact-messages.service';

@Controller('contact-messages')
export class ContactMessagesController {
  constructor(private readonly service: ContactMessagesService) {}

  // Público: 5 mensajes cada 10 minutos por IP
  @Post()
  @UseGuards(RealIpThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  create(@Body() dto: CreateContactMessageDto) {
    return this.service.create(dto);
  }

  @Get()
  @Auth(ValidRoles.ADMIN)
  findAll(@Query() filterDto: FilterContactMessagesDto) {
    return this.service.findAll(filterDto);
  }

  @Patch(':id/leido')
  @Auth(ValidRoles.ADMIN)
  updateLeido(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeidoDto,
  ) {
    return this.service.updateLeido(id, dto.leido ?? true);
  }

  @Delete(':id')
  @Auth(ValidRoles.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
