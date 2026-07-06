import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AUTH_ACTOR_TYPES, AuthActor } from '../auth.types';

@Injectable()
export class TenantCustomerSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthActor }>();

    if (req.user?.actorType === AUTH_ACTOR_TYPES.TENANT_CUSTOMER) {
      return true;
    }

    throw new ForbiddenException('Tenant customer authentication required.');
  }
}
