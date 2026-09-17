import { ForbiddenException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import type { TenantPermission } from '@repo/api-contracts';

import { AUTH_ACTOR_TYPES, type AuthActor } from 'src/modules/tenant-management/auth/shared/auth.types';

import { TenantAuthorization } from './tenant-authorization.public-api';
import type { TenantPermissionRequirement } from './tenant-authorization-requirement';

@Injectable()
export class TenantAuthorizationHttpEnforcer {
  constructor(private readonly tenantAuthorization: TenantAuthorization) {}

  async requirePermission(actor: AuthActor, permission: TenantPermission): Promise<void> {
    await this.enforceRequirement(actor, { type: 'ONE', permission });
  }

  async requireAnyPermissions(
    actor: AuthActor,
    permissions: readonly [TenantPermission, ...TenantPermission[]],
  ): Promise<void> {
    await this.enforceRequirement(actor, { type: 'ANY', permissions });
  }

  async requireAllPermissions(
    actor: AuthActor,
    permissions: readonly [TenantPermission, ...TenantPermission[]],
  ): Promise<void> {
    await this.enforceRequirement(actor, { type: 'ALL', permissions });
  }

  async enforceRequirement(actor: AuthActor, requirement: TenantPermissionRequirement): Promise<void> {
    if (actor.actorType !== AUTH_ACTOR_TYPES.TENANT_USER) {
      throw new ForbiddenException('Authenticated actor is not allowed to access this resource.');
    }

    const subject = {
      tenantId: actor.tenantId,
      tenantUserId: actor.id,
    };

    let result: Awaited<ReturnType<TenantAuthorization['hasPermission']>>;
    switch (requirement.type) {
      case 'ONE':
        result = await this.tenantAuthorization.hasPermission(subject, requirement.permission);
        break;
      case 'ANY':
        result = await this.tenantAuthorization.hasAnyPermission(subject, requirement.permissions);
        break;
      case 'ALL':
        result = await this.tenantAuthorization.hasAllPermissions(subject, requirement.permissions);
        break;
    }

    if (result.isErr()) {
      if (result.error.code === 'TenantAuthorizationSubjectNotFound') {
        throw new UnauthorizedException('Authentication is no longer valid.');
      }

      throw new InternalServerErrorException('Tenant authorization could not be evaluated.');
    }

    if (!result.value) {
      throw new ForbiddenException('Required tenant permission is missing.');
    }
  }
}
