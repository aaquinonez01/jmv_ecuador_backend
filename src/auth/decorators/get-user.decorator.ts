import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { User } from '../entities/user';

export const GetUser = createParamDecorator((data, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<{ user: User }>();
  const user: User = req.user;

  if (!user) {
    throw new InternalServerErrorException(
      'Usuario no encontrado en el request',
    );
  }
  return user;
});
