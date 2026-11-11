import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { RealIpThrottlerGuard } from 'src/common/guards/real-ip-throttler.guard';
import { FriendsService } from './friends.service';

export class FriendRequestDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{6}$/, {
    message: 'El código tiene 6 letras o números',
  })
  code?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class SearchDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string;
}

// Amigos dentro de la app (solo miembros con sesión)
@Controller('friends')
export class FriendsController {
  constructor(private readonly service: FriendsService) {}

  @Get()
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  overview(@GetUser() user: User) {
    return this.service.overview(user.id!);
  }

  // Buscar por código se limita para que no se puedan adivinar códigos
  @Get('code/:code')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  @UseGuards(RealIpThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  lookup(@GetUser() user: User, @Param('code') code: string) {
    if (!/^[A-Za-z0-9]{6}$/.test(code))
      throw new BadRequestException('El código tiene 6 letras o números');
    return this.service.lookup(user.id!, code);
  }

  @Get('comunidad')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  search(@GetUser() user: User, @Query() q: SearchDto) {
    return this.service.searchMyComunidad(user.id!, q.q);
  }

  @Post('requests')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  @UseGuards(RealIpThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  request(@GetUser() user: User, @Body() dto: FriendRequestDto) {
    return this.service.request(user.id!, dto);
  }

  @Post('requests/:id/accept')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  accept(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.accept(user.id!, id);
  }

  @Delete('requests/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  decline(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.decline(user.id!, id);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  remove(
    @GetUser() user: User,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.service.remove(user.id!, userId);
  }

  @Post(':userId/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  block(@GetUser() user: User, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.service.block(user.id!, userId);
  }

  @Delete(':userId/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  unblock(
    @GetUser() user: User,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.service.unblock(user.id!, userId);
  }
}
