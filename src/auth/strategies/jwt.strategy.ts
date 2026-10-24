import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../entities/user';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';

export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    configService: ConfigService,
  ) {
    super({
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }
  async validate(payload: JwtPayload): Promise<User> {
    const { email, iat } = payload;

    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      throw new UnauthorizedException('Token no válido');
    }
    // Sesiones abiertas antes de cambiar la contraseña
    if (
      user.passwordChangedAt &&
      (!iat || iat < Math.floor(user.passwordChangedAt.getTime() / 1000))
    ) {
      throw new UnauthorizedException(
        'Tu sesión expiró. Vuelve a iniciar sesión.',
      );
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Usuario no activo');
    }
    return user;
  }
}
