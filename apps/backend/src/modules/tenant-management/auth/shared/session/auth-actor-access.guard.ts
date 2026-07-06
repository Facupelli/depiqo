import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { IS_PUBLIC_KEY } from 'src/core/decorators/public.decorator';
import { AUTH_ACTOR_TYPES, AuthActor, AuthActorType } from '../auth.types';
import { AUTH_ACTOR_ACCESS_KEY } from './auth-actor-access.decorator';

@Injectable()
export class AuthActorAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthActor }>();

    if (!req.path.startsWith('/v2/')) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    if (!req.isAuthenticated?.() || !req.user) {
      throw new UnauthorizedException('Authentication required.');
    }

    if (req.path.startsWith('/v2/auth/')) {
      return true;
    }

    const allowedActorTypes = this.reflector.getAllAndOverride<AuthActorType[]>(AUTH_ACTOR_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? [AUTH_ACTOR_TYPES.TENANT_USER];

    if (allowedActorTypes.includes(req.user.actorType)) {
      return true;
    }

    throw new ForbiddenException('Authenticated actor is not allowed to access this resource.');
  }
}
