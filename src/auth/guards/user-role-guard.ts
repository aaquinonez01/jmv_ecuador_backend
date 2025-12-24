import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { META_ROLES } from '../decorators/role-protected.decorator';
import { User } from '../entities/user';

@Injectable()
export class UserRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      META_ROLES,
      context.getHandler(),
    );
    if (!requiredRoles) return true;
    const req = context.switchToHttp().getRequest<{ user: User }>();
    const user: User = req.user;

    if (!user) {
      throw new InternalServerErrorException('Usuario no encontrado');
    }

    if (requiredRoles.includes(user.role)) {
      return true;
    }
    throw new ForbiddenException(
      'Usuario no tiene permisos para acceder a este recurso',
    );
  }
}
