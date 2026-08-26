import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { StorefrontTenantRequest } from '../../../tenant-context/guards/storefront-tenant-context.guard';
import { AUTH_ACTOR_TYPES, AuthActor } from '../auth.types';

@Injectable()
export class StorefrontTenantCustomerSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<StorefrontTenantRequest & { user?: AuthActor }>();
    const actor = request.user;

    if (actor?.actorType !== AUTH_ACTOR_TYPES.TENANT_CUSTOMER) {
      throw new ForbiddenException('Tenant customer authentication required.');
    }

    if (actor.tenantId !== request.storefrontTenantContext.tenantId) {
      throw new ForbiddenException('Customer session does not belong to this storefront tenant.');
    }

    return true;
  }
}
