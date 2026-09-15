import { randomUUID } from 'node:crypto';

import { V2TenantSystemRole, V2UserRole } from '../../../src/generated/prisma/enums';
import { createDirectDatabaseTestContext, DirectDatabaseTestContext } from '../../support/direct-database-test-context';
import { useIntegrationTestContext } from '../../support/integration-test-context';

describe('Prisma database integration', () => {
  let database: DirectDatabaseTestContext;

  useIntegrationTestContext(async () => {
    database = await createDirectDatabaseTestContext();
    return database;
  });

  it('persists and reads data through Prisma against real PostgreSQL', async () => {
    const created = await database.prisma.billingUnit.create({
      data: { label: `Day ${randomUUID()}`, durationMinutes: 1440, sortOrder: 1 },
    });

    await expect(database.prisma.billingUnit.findUnique({ where: { id: created.id } })).resolves.toMatchObject({
      label: created.label,
      durationMinutes: 1440,
    });
  });

  it('enforces database uniqueness without requiring an empty database', async () => {
    const label = `Unique billing unit ${randomUUID()}`;
    await database.prisma.billingUnit.create({ data: { label, durationMinutes: 60, sortOrder: 2 } });

    await expect(
      database.prisma.billingUnit.create({ data: { label, durationMinutes: 30, sortOrder: 3 } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('enforces tenant role and permission persistence constraints', async () => {
    const firstTenant = await createTenant('first');
    const secondTenant = await createTenant('second');
    const firstAdminRole = await database.prisma.v2TenantRole.create({
      data: {
        tenantId: firstTenant.id,
        name: 'Administrador',
        systemRole: V2TenantSystemRole.ADMIN,
      },
    });

    await database.prisma.v2TenantRole.create({
      data: { tenantId: secondTenant.id, name: 'Administrador', systemRole: V2TenantSystemRole.ADMIN },
    });
    await database.prisma.v2TenantRole.create({
      data: { tenantId: firstTenant.id, name: 'Operaciones' },
    });

    await expect(
      database.prisma.v2TenantRole.create({ data: { tenantId: firstTenant.id, name: 'Administrador' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      database.prisma.v2TenantRole.create({
        data: { tenantId: firstTenant.id, name: 'Otro administrador', systemRole: V2TenantSystemRole.ADMIN },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    await database.prisma.v2TenantRolePermission.create({
      data: { roleId: firstAdminRole.id, permission: 'test.permission' },
    });
    await expect(
      database.prisma.v2TenantRolePermission.create({
        data: { roleId: firstAdminRole.id, permission: 'test.permission' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('defaults new tenant users to no related role and no required password change', async () => {
    const tenant = await createTenant('user-defaults');
    const user = await database.prisma.v2TenantUser.create({
      data: {
        tenantId: tenant.id,
        email: `user-${randomUUID()}@test.local`,
        role: V2UserRole.ADMIN,
      },
    });

    expect(user).toMatchObject({ roleId: null, mustChangePassword: false, role: V2UserRole.ADMIN });
  });

  it('prevents assigning a tenant user to another tenant role', async () => {
    const firstTenant = await createTenant('role-owner');
    const secondTenant = await createTenant('user-owner');
    const role = await database.prisma.v2TenantRole.create({
      data: { tenantId: firstTenant.id, name: 'Role' },
    });

    await expect(
      database.prisma.v2TenantUser.create({
        data: { tenantId: secondTenant.id, email: `user-${randomUUID()}@test.local`, roleId: role.id },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  function createTenant(label: string) {
    const unique = randomUUID();

    return database.prisma.v2Tenant.create({
      data: { name: `Tenant ${label} ${unique}`, slug: `tenant-${label}-${unique}` },
    });
  }
});
