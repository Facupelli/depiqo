import { V2TenantSystemRole } from 'src/generated/prisma/enums';

import { TenantAuthorizationRoleProvisioner } from './tenant-authorization-role.provisioner';
import { DEFAULT_MEMBER_TENANT_PERMISSIONS } from './tenant-permission.registry';

describe('TenantAuthorizationRoleProvisioner', () => {
  it('creates Administrator and Miembro with the canonical Member baseline', async () => {
    const create = jest
      .fn()
      .mockResolvedValueOnce({ id: 'administrator-role' })
      .mockResolvedValueOnce({ id: 'member-role' });
    const provisioner = new TenantAuthorizationRoleProvisioner();

    // SAFETY: This focused test double implements every member exercised by the subject; unimplemented framework or service members are never accessed.
    await expect(provisioner.provision({ v2TenantRole: { create } } as never, 'tenant-1')).resolves.toEqual({
      administratorRoleId: 'administrator-role',
      memberRoleId: 'member-role',
    });

    expect(create).toHaveBeenNthCalledWith(1, {
      data: {
        tenantId: 'tenant-1',
        name: 'Administrador',
        systemRole: V2TenantSystemRole.ADMIN,
      },
      select: { id: true },
    });
    expect(create).toHaveBeenNthCalledWith(2, {
      data: {
        tenantId: 'tenant-1',
        name: 'Miembro',
        permissions: {
          createMany: {
            data: DEFAULT_MEMBER_TENANT_PERMISSIONS.map((permission) => ({ permission })),
          },
        },
      },
      select: { id: true },
    });
  });
});
