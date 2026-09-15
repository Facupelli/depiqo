import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { IS_PUBLIC_KEY } from 'src/core/decorators/public.decorator';
import type { AuthActor } from 'src/modules/tenant-management/auth/shared/auth.types';

import { TenantAuthorizationHttpEnforcer } from './tenant-authorization-http.enforcer';
import {
  TENANT_AUTHORIZATION_REQUIREMENT_KEY,
  type TenantAuthorizationRequirement,
} from './tenant-authorization-requirement';

@Injectable()
export class TenantAuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationEnforcer: TenantAuthorizationHttpEnforcer,
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
    if (!requirement || requirement.type === 'EXEMPT' || requirement.type === 'CONDITIONAL') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthActor }>();
    if (!request.isAuthenticated?.() || !request.user) {
      throw new UnauthorizedException('Authentication required.');
    }

    await this.authorizationEnforcer.enforceRequirement(request.user, requirement);
    return true;
  }
}
