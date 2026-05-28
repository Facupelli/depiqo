import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthActor } from '../auth.types';

type AuthenticatedRequest = Request & {
  user: AuthActor;
};

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthActor => {
  const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
  return req.user;
});
