import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { PushService } from './push.service';

export class PushTokenDto {
  @IsString()
  @MaxLength(200)
  token!: string;

  @IsOptional()
  @IsIn(['ios', 'android', 'web'])
  platform?: string;
}

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post('token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  async register(@GetUser() user: User, @Body() dto: PushTokenDto) {
    if (!this.push.isValidToken(dto.token))
      throw new BadRequestException('Token de aviso no válido');
    await this.push.register(user.id!, dto.token, dto.platform);
  }

  @Delete('token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  async unregister(@GetUser() user: User, @Body() dto: PushTokenDto) {
    await this.push.unregister(user.id!, dto.token);
  }
}
