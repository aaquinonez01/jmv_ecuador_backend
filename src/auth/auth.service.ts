import { RegisterUserDto } from './dto/register-user.dto';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { User } from './entities/user';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import * as bcrypt from 'bcrypt';
import { Logger } from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { uploadAvatar } from 'src/helpers/file-upload.helper';
import { ValidRoles } from './interfaces/valid-roles.interface';
import { escapeHtml, MailService } from '../mail/mail.service';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const hashResetToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export type PublicUser = Omit<User, 'password' | 'passwordChangedAt'>;

export function toPublicUser(user: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, passwordChangedAt: __, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepository: Repository<PasswordResetToken>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
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
    const user = await this.findUserByEmail(email);
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

  async forgotPassword({ email }: ForgotPasswordDto) {
    // Misma respuesta exista o no la cuenta, para no revelar qué correos existen
    const response = {
      message:
        'Si el correo está registrado, te enviaremos un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.',
    };

    try {
      const user = await this.findUserByEmail(email);
      if (!user || !user.isActive) return response;

      // Un solo enlace vigente por usuario: los anteriores dejan de servir
      await this.resetTokenRepository.delete({ userId: user.id! });

      const token = randomBytes(32).toString('hex');
      await this.resetTokenRepository.save(
        this.resetTokenRepository.create({
          tokenHash: hashResetToken(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
          userId: user.id!,
        }),
      );

      // Sin await: el correo no debe retrasar la respuesta
      void this.sendResetEmail(user, token);
    } catch (error) {
      // No se expone el fallo al cliente para no filtrar información
      this.logger.error(error);
    }
    return response;
  }

  async resetPassword({ token, password }: ResetPasswordDto) {
    const invalid = new BadRequestException(
      'El enlace no es válido o ya expiró. Solicita uno nuevo.',
    );

    const resetToken = await this.resetTokenRepository.findOne({
      where: {
        tokenHash: hashResetToken(token),
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: true },
    });
    if (!resetToken || !resetToken.user?.isActive) throw invalid;

    const userId = resetToken.userId;
    const newPassword = await bcrypt.hash(password, 10);

    await this.dataSource.transaction(async (manager) => {
      // Marcar como usado de forma atómica: si dos peticiones llegan a la vez,
      // solo una lo consigue (uso único)
      const result = await manager.update(
        PasswordResetToken,
        { id: resetToken.id, usedAt: IsNull() },
        { usedAt: new Date() },
      );
      if (!result.affected) throw invalid;

      // passwordChangedAt invalida los JWT emitidos antes del cambio
      await manager.update(
        User,
        { id: userId },
        { password: newPassword, passwordChangedAt: new Date() },
      );
      await manager.delete(PasswordResetToken, {
        userId,
        usedAt: IsNull(),
      });
    });

    return {
      message:
        'Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.',
    };
  }

  private async sendResetEmail(user: User, token: string) {
    const siteUrl = (
      this.configService.get<string>('PUBLIC_SITE_URL') ||
      'https://jmvecuador.org'
    ).replace(/\/+$/, '');
    const link = `${siteUrl}/reset-password?token=${token}`;
    const nombre = user.displayName || user.fullName || '';
    const saludo = nombre ? `Hola, ${nombre}:` : 'Hola:';

    await this.mailService.send({
      to: user.email,
      subject: 'Restablece tu contraseña de JMV Ecuador',
      text: [
        saludo,
        '',
        'Recibimos una solicitud para restablecer la contraseña de tu cuenta en JMV Ecuador.',
        'Abre este enlace para elegir una nueva (vence en 1 hora y solo funciona una vez):',
        link,
        '',
        'Si no fuiste tú, puedes ignorar este correo: tu contraseña no cambiará.',
      ].join('\n'),
      html: `
        <div style="font-family:sans-serif;line-height:1.5;color:#1f2937">
          <p>${escapeHtml(saludo)}</p>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en JMV Ecuador.</p>
          <p>
            <a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;background:#1e3a8a;color:#ffffff;border-radius:8px;text-decoration:none">
              Elegir una nueva contraseña
            </a>
          </p>
          <p>El enlace vence en 1 hora y solo funciona una vez. Si el botón no funciona, copia esta dirección en tu navegador:</p>
          <p style="word-break:break-all">${escapeHtml(link)}</p>
          <p>Si no fuiste tú, puedes ignorar este correo: tu contraseña no cambiará.</p>
        </div>
      `,
    });
  }

  /**
   * Busca por el correo exacto y, si no hay, sin distinguir mayúsculas
   * (solo si la coincidencia es única), igual en el login y en la recuperación.
   */
  private async findUserByEmail(email: string): Promise<User | null> {
    const exact = await this.userRepository.findOne({ where: { email } });
    if (exact) return exact;
    const matches = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.comunidad', 'comunidad')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
      .take(2)
      .getMany();
    return matches.length === 1 ? matches[0] : null;
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
