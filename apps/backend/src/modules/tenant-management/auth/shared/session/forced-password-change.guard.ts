import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { IS_PUBLIC_KEY } from 'src/core/decorators/public.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AUTH_ACTOR_TYPES, AuthActor } from '../auth.types';

const ALLOWED_ROUTES = new Set(['GET /auth/me', 'POST /auth/logout', 'POST /auth/change-password']);

@Injectable()
export class ForcedPasswordChangeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthActor }>();
    const actor = request.user;
    if (
      !actor ||
      actor.actorType !== AUTH_ACTOR_TYPES.TENANT_USER ||
      !actor.mustChangePassword ||
      ALLOWED_ROUTES.has(`${request.method} ${request.path}`)
    ) {
      return true;
    }

    const error = {
      code: 'tenant_management.password_change_required',
      message: 'The authenticated user must change their temporary password before continuing.',
      context: { tenantId: actor.tenantId, tenantUserId: actor.id },
    };
    throw ProblemException.from({
      problemDetails: createProblemDetails({
        type: createProblemType('tenant-management/password-change-required'),
        title: 'Password change required',
        status: HttpStatus.FORBIDDEN,
        detail: 'Change the temporary password before accessing this resource.',
        extensions: { code: error.code },
      }),
      applicationError: error,
    });
  }
}
