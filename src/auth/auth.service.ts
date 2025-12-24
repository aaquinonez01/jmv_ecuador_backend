import { RegisterUserDto } from './dto/register-user.dto';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user';
import * as bcrypt from 'bcrypt';
import { Logger } from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { uploadAvatar } from 'src/helpers/file-upload.helper';
@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async registerUser(
    registerUserDto: RegisterUserDto,
    avatar?: Express.Multer.File,
  ) {
    try {
      const { password, ...userData } = registerUserDto;
      const newPassword = bcrypt.hashSync(password, 10);

      // Subir avatar si viene
      let profilePicture: string | null = null;
      if (avatar) {
        profilePicture = await uploadAvatar(avatar);
      }

      const newUser: User = this.userRepository.create({
        ...userData,

        password: newPassword,
        ...(profilePicture ? { profilePicture } : {}),
      });
      await this.userRepository.save(newUser);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = newUser;
      const payload: JwtPayload = {
        email: userWithoutPassword.email,
        role: userWithoutPassword.role,
        id: userWithoutPassword.id!,
      };
      const token = this.getJwtToken(payload);
      return {
        message: 'Usuario registrado correctamente',
        newUser: userWithoutPassword,
        token,
      };
    } catch (error: unknown) {
      this.handleExceptions(error);
    }
  }

  async loginUser(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('El usuario no existe');
    }
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('La contraseña es incorrecta');
    }
    const payload: JwtPayload = {
      email: user.email,
      role: user.role,
      id: user.id!,
    };
    const token = this.getJwtToken(payload);
    return {
      message: 'Usuario logueado correctamente',
      user,
      token,
    };
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
    avatar?: Express.Multer.File,
  ) {
    try {
      const user = await this.userRepository.preload({
        id: userId,
        ...updateProfileDto,
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Subir avatar si viene
      if (avatar) {
        const profilePicture = await uploadAvatar(avatar);
        if (profilePicture) {
          user.profilePicture = profilePicture;
        }
      }

      await this.userRepository.save(user);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = user;

      return {
        message: 'Perfil actualizado correctamente',
        user: userWithoutPassword,
      };
    } catch (error: unknown) {
      this.handleExceptions(error);
    }
  }

  private getJwtToken(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }

  private handleExceptions(error: unknown): never {
    this.logger.error(error);
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === '23505'
    ) {
      throw new BadRequestException('El usuario ya existe');
    }
    console.log(error);
    throw new InternalServerErrorException(
      'Error al realizar la operación',
      error instanceof Error ? error.message : 'Error desconocido',
    );
  }
}
