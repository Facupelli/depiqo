import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { IS_PUBLIC_KEY } from 'src/core/decorators/public.decorator';
import { AUTH_ACTOR_TYPES, type AuthActor } from 'src/modules/tenant-management/auth/shared/auth.types';

import { TenantAuthorization } from './tenant-authorization.public-api';
import {
  TENANT_AUTHORIZATION_REQUIREMENT_KEY,
  type TenantAuthorizationRequirement,
} from './tenant-authorization-requirement';

@Injectable()
export class TenantAuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantAuthorization: TenantAuthorization,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets);

    if (isPublic) {
      return true;
    }

    const requirement = this.reflector.getAllAndOverride<TenantAuthorizationRequirement>(
      TENANT_AUTHORIZATION_REQUIREMENT_KEY,
      targets,
    );

    // Transition mode: strict missing-metadata denial is intentionally deferred.
    if (!requirement || requirement.type === 'EXEMPT') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthActor }>();
    if (!request.isAuthenticated?.() || !request.user) {
      throw new UnauthorizedException('Authentication required.');
    }

    if (request.user.actorType !== AUTH_ACTOR_TYPES.TENANT_USER) {
      throw new ForbiddenException('Authenticated actor is not allowed to access this resource.');
    }

    const subject = {
      tenantId: request.user.tenantId,
      tenantUserId: request.user.id,
    };
    const result =
      requirement.type === 'ONE'
        ? await this.tenantAuthorization.hasPermission(subject, requirement.permission)
        : await this.tenantAuthorization.hasAnyPermission(subject, requirement.permissions);

    if (result.isErr()) {
      if (result.error.code === 'TenantAuthorizationSubjectNotFound') {
        throw new UnauthorizedException('Authentication is no longer valid.');
      }

      throw new InternalServerErrorException('Tenant authorization could not be evaluated.');
    }

    if (!result.value) {
      throw new ForbiddenException('Required tenant permission is missing.');
    }

    return true;
  }
}
