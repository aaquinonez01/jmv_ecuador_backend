import { RegisterUserDto } from './dto/register-user.dto';
import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthService, toPublicUser } from './auth.service';
import { RealIpThrottlerGuard } from 'src/common/guards/real-ip-throttler.guard';
import { LoginUserDto } from './dto/login-user.dto';
import { GetUser } from './decorators/get-user.decorator';
import { User } from './entities/user';
import { Auth } from './decorators/auth.decorator';
import { ValidRoles } from './interfaces/valid-roles.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { multerConfig } from '../posts/config/multer.config';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(RealIpThrottlerGuard)
  @UseInterceptors(FileInterceptor('avatar', multerConfig))
  registerUser(
    @Body() registerUserDto: RegisterUserDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.authService.registerUser(registerUserDto, avatar);
  }

  @Post('login')
  @UseGuards(RealIpThrottlerGuard)
  loginUser(@Body() loginUserDto: LoginUserDto) {
    return this.authService.loginUser(loginUserDto);
  }

  // 5 solicitudes cada 15 minutos por IP
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RealIpThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RealIpThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('me')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  me(@GetUser() user: User) {
    return { user: toPublicUser(user) };
  }

  @Get('test-token-protected')
  @Auth(ValidRoles.ADMIN)
  testTokenProtected(@GetUser() user: User) {
    return {
      message: 'Token protegido',
      user: toPublicUser(user),
    };
  }

  @Patch('profile')
  @Auth()
  @UseInterceptors(FileInterceptor('avatar', multerConfig))
  updateProfile(
    @GetUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.authService.updateProfile(user.id!, updateProfileDto, avatar);
  }
}
