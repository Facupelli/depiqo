import { Injectable } from '@nestjs/common';

import type { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';
import { V2TenantSystemRole } from 'src/generated/prisma/enums';

import { DEFAULT_MEMBER_TENANT_PERMISSIONS } from './tenant-permission.registry';

export interface ProvisionedTenantAuthorizationRoles {
  administratorRoleId: string;
  memberRoleId: string;
}

@Injectable()
export class TenantAuthorizationRoleProvisioner {
  async provision(tx: PrismaTransactionClient, tenantId: string): Promise<ProvisionedTenantAuthorizationRoles> {
    const administrator = await tx.v2TenantRole.create({
      data: {
        tenantId,
        name: 'Administrador',
        systemRole: V2TenantSystemRole.ADMIN,
      },
      select: { id: true },
    });

    const member = await tx.v2TenantRole.create({
      data: {
        tenantId,
        name: 'Miembro',
        permissions: {
          createMany: {
            data: DEFAULT_MEMBER_TENANT_PERMISSIONS.map((permission) => ({ permission })),
          },
        },
      },
      select: { id: true },
    });

    return {
      administratorRoleId: administrator.id,
      memberRoleId: member.id,
    };
  }
}
