import { Injectable } from '@nestjs/common';
import type { TenantPermission } from '@repo/api-contracts';
import { err, ok, type Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2TenantSystemRole } from 'src/generated/prisma/enums';

import {
  type EffectiveTenantPermissions,
  TenantAuthorization,
  type TenantAuthorizationError,
  type TenantAuthorizationSubject,
} from './tenant-authorization.public-api';
import { ALL_TENANT_PERMISSIONS, parseTenantPermission } from './tenant-permission.registry';

@Injectable()
export class TenantAuthorizationService extends TenantAuthorization {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getEffectivePermissions(
    subject: TenantAuthorizationSubject,
  ): Promise<Result<EffectiveTenantPermissions, TenantAuthorizationError>> {
    const tenantUser = await this.prisma.client.v2TenantUser.findFirst({
      where: {
        id: subject.tenantUserId,
        tenantId: subject.tenantId,
      },
      select: {
        roleId: true,
        tenantRole: {
          select: {
            id: true,
            name: true,
            systemRole: true,
            permissions: {
              select: { permission: true },
            },
          },
        },
      },
    });

    if (!tenantUser) {
      return err({
        code: 'TenantAuthorizationSubjectNotFound',
        message: `Tenant user "${subject.tenantUserId}" was not found in tenant "${subject.tenantId}".`,
      });
    }

    if (!tenantUser.roleId || !tenantUser.tenantRole) {
      return err({
        code: 'TenantAuthorizationStateInvalid',
        message: `Tenant user "${subject.tenantUserId}" has no assigned tenant role.`,
      });
    }

    const role = tenantUser.tenantRole;
    if (role.systemRole === V2TenantSystemRole.ADMIN) {
      return ok(
        Object.freeze({
          roleId: role.id,
          roleName: role.name,
          systemRole: V2TenantSystemRole.ADMIN,
          permissions: ALL_TENANT_PERMISSIONS,
        }),
      );
    }

    try {
      const persistedPermissions = new Set(role.permissions.map(({ permission }) => parseTenantPermission(permission)));
      const permissions = Object.freeze(
        ALL_TENANT_PERMISSIONS.filter((permission) => persistedPermissions.has(permission)),
      );
      return ok(
        Object.freeze({
          roleId: role.id,
          roleName: role.name,
          systemRole: null,
          permissions,
        }),
      );
    } catch (cause) {
      return err({
        code: 'TenantAuthorizationStateInvalid',
        message: `Tenant role "${role.id}" contains an unknown permission identifier.`,
        cause,
      });
    }
  }

  async hasPermission(
    subject: TenantAuthorizationSubject,
    permission: TenantPermission,
  ): Promise<Result<boolean, TenantAuthorizationError>> {
    const result = await this.getEffectivePermissions(subject);
    return result.map(({ permissions }) => permissions.includes(permission));
  }

  async hasAnyPermission(
    subject: TenantAuthorizationSubject,
    permissions: readonly TenantPermission[],
  ): Promise<Result<boolean, TenantAuthorizationError>> {
    const result = await this.getEffectivePermissions(subject);
    return result.map(({ permissions: effectivePermissions }) =>
      permissions.some((permission) => effectivePermissions.includes(permission)),
    );
  }

  async hasAllPermissions(
    subject: TenantAuthorizationSubject,
    permissions: readonly [TenantPermission, ...TenantPermission[]],
  ): Promise<Result<boolean, TenantAuthorizationError>> {
    const result = await this.getEffectivePermissions(subject);
    return result.map(({ permissions: effectivePermissions }) =>
      permissions.every((permission) => effectivePermissions.includes(permission)),
    );
  }
}
