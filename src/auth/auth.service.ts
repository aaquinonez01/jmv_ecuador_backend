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
import { ValidRoles } from './interfaces/valid-roles.interface';

export type PublicUser = Omit<User, 'password'>;

export function toPublicUser(user: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

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
      // role nunca se toma del cliente: todo registro público es USER
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {
        password,
        comunidadId,
        role: _role,
        ...userData
      } = registerUserDto;
      const newPassword = await bcrypt.hash(password, 10);

      // Subir avatar si viene
      let profilePicture: string | null = null;
      if (avatar) {
        profilePicture = await uploadAvatar(avatar);
      }

      const newUser: User = this.userRepository.create({
        ...userData,
        ...(comunidadId ? { comunidad: { id: comunidadId } } : {}),
        password: newPassword,
        role: ValidRoles.USER,
        isActive: true,
        ...(profilePicture ? { profilePicture } : {}),
      });
      await this.userRepository.save(newUser);

      const userWithoutPassword = toPublicUser(newUser);
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
    // Mismo mensaje en ambos casos para no revelar qué correos existen
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new BadRequestException('Credenciales inválidas');
    }
    if (!user.isActive) {
      throw new BadRequestException('Usuario no activo');
    }
    const payload: JwtPayload = {
      email: user.email,
      role: user.role,
      id: user.id!,
    };
    const token = this.getJwtToken(payload);
    return {
      message: 'Usuario logueado correctamente',
      user: toPublicUser(user),
      token,
    };
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
    avatar?: Express.Multer.File,
  ) {
    try {
      // Solo campos de perfil; role/isActive/password no se pueden cambiar aquí
      const {
        comunidadId,
        fullName,
        displayName,
        birthDate,
        phoneNumber,
        address,
        bio,
      } = updateProfileDto;
      const profileData = Object.fromEntries(
        Object.entries({
          fullName,
          displayName,
          birthDate,
          phoneNumber,
          address,
          bio,
        }).filter(([, value]) => value !== undefined),
      );
      const user = await this.userRepository.preload({
        id: userId,
        ...profileData,
        ...(comunidadId ? { comunidad: { id: comunidadId } } : {}),
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

      return {
        message: 'Perfil actualizado correctamente',
        user: toPublicUser(user),
      };
    } catch (error: unknown) {
      this.handleExceptions(error);
    }
  }

  private getJwtToken(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }

  private handleExceptions(error: unknown): never {
    if (error instanceof NotFoundException) throw error;
    this.logger.error(error);
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === '23505'
    ) {
      throw new BadRequestException('El usuario ya existe');
    }
    throw new InternalServerErrorException('Error al realizar la operación');
  }
}
