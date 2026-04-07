import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';

const DEFAULT_JWT_EXPIRES_IN_SECONDS = 2 * 60 * 60;

function parseJwtExpiresInToSeconds(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    const match = normalized.match(/^(\d+)\s*([smhd])?$/);

    if (match) {
      const amount = Number(match[1]);
      const unit = match[2] ?? 's';

      if (!Number.isFinite(amount) || amount <= 0) {
        return DEFAULT_JWT_EXPIRES_IN_SECONDS;
      }

      switch (unit) {
        case 'm':
          return amount * 60;
        case 'h':
          return amount * 60 * 60;
        case 'd':
          return amount * 60 * 60 * 24;
        case 's':
        default:
          return amount;
      }
    }
  }

  return DEFAULT_JWT_EXPIRES_IN_SECONDS;
}

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = parseJwtExpiresInToSeconds(
          configService.get('JWT_EXPIRES_IN'),
        );

        return {
          secret: configService.get('JWT_SECRET'),
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  exports: [TypeOrmModule, JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
