import { RegisterUserDto } from './dto/register-user.dto';
import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
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
  @UseInterceptors(FileInterceptor('avatar', multerConfig))
  registerUser(
    @Body() registerUserDto: RegisterUserDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.authService.registerUser(registerUserDto, avatar);
  }

  @Post('login')
  loginUser(@Body() loginUserDto: LoginUserDto) {
    return this.authService.loginUser(loginUserDto);
  }

  @Get('me')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  me(@GetUser() user: User) {
    return { user };
  }

  @Get('test-token-protected')
  @Auth(ValidRoles.ADMIN)
  testTokenProtected(@GetUser() user: User) {
    console.log(user);
    return {
      message: 'Token protegido',
      user,
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
