import { TenantPermission } from '@repo/api-contracts';
import { V2TenantSystemRole } from 'src/generated/prisma/enums';

import { TenantAuthorizationService } from './tenant-authorization.service';
import { ALL_TENANT_PERMISSIONS } from './tenant-permission.registry';

describe('TenantAuthorizationService', () => {
  const subject = { tenantId: 'tenant-1', tenantUserId: 'user-1' };

  function createService(initialUser: unknown) {
    let user = initialUser;
    const findFirst = jest.fn().mockImplementation(async () => user);
    // SAFETY: The preceding test setup and assertions establish this value shape before the test inspects it.
    const findMany = jest
      .fn()
      .mockImplementation(async () => (user as ReturnType<typeof userWithRole>)?.tenantRole.permissions ?? []);

    // SAFETY: This focused test double implements every member exercised by the subject; unimplemented framework or service members are never accessed.
    return {
      service: new TenantAuthorizationService({
        client: { v2TenantUser: { findFirst }, v2TenantRolePermission: { findMany } },
      } as never),
      findFirst,
      findMany,
      setUser(nextUser: unknown) {
        user = nextUser;
      },
    };
  }

  function userWithRole(input?: {
    roleId?: string;
    roleName?: string;
    systemRole?: V2TenantSystemRole | null;
    permissions?: string[];
  }) {
    const roleId = input?.roleId ?? 'role-1';
    return {
      roleId,
      tenantRole: {
        id: roleId,
        name: input?.roleName ?? 'Operations',
        systemRole: input?.systemRole ?? null,
        permissions: (input?.permissions ?? []).map((permission) => ({ permission })),
      },
    };
  }

  it.each([[[]], [[TenantPermission.TeamManage]], [[TenantPermission.ProductsRead, TenantPermission.RentalsConfirm]]])(
    'gives Administrator exactly every registered permission regardless of persisted rows',
    async (persistedPermissions) => {
      const { service, findMany } = createService(
        userWithRole({ systemRole: V2TenantSystemRole.ADMIN, permissions: persistedPermissions }),
      );

      const result = await service.getEffectivePermissions(subject);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({
        roleId: 'role-1',
        roleName: 'Operations',
        systemRole: V2TenantSystemRole.ADMIN,
        permissions: ALL_TENANT_PERMISSIONS,
      });
      expect(result._unsafeUnwrap().permissions).toBe(ALL_TENANT_PERMISSIONS);
      expect(findMany).not.toHaveBeenCalled();
    },
  );

  it('gives a custom role exactly its persisted registered permissions', async () => {
    const persistedPermissions = [TenantPermission.ProductsRead, TenantPermission.InventoryManage];
    const { service } = createService(userWithRole({ permissions: persistedPermissions }));

    const result = await service.getEffectivePermissions(subject);

    expect(result._unsafeUnwrap().permissions).toEqual(persistedPermissions);
    expect(Object.isFrozen(result._unsafeUnwrap())).toBe(true);
    expect(Object.isFrozen(result._unsafeUnwrap().permissions)).toBe(true);
  });

  it('returns custom role permissions in canonical registry order', async () => {
    const { service } = createService(
      userWithRole({ permissions: [TenantPermission.InventoryManage, TenantPermission.ProductsRead] }),
    );

    const result = await service.getEffectivePermissions(subject);

    expect(result._unsafeUnwrap().permissions).toEqual([
      TenantPermission.ProductsRead,
      TenantPermission.InventoryManage,
    ]);
  });

  it('resolves an empty custom role to an empty permission set', async () => {
    const { service } = createService(userWithRole());

    const result = await service.getEffectivePermissions(subject);

    expect(result._unsafeUnwrap().permissions).toEqual([]);
  });

  it('checks one permission against current effective permissions', async () => {
    const { service } = createService(userWithRole({ permissions: [TenantPermission.ProductsRead] }));

    const allowed = await service.hasPermission(subject, TenantPermission.ProductsRead);
    const denied = await service.hasPermission(subject, TenantPermission.ProductsManage);

    expect(allowed._unsafeUnwrap()).toBe(true);
    expect(denied._unsafeUnwrap()).toBe(false);
  });

  it('checks whether any requested permission is effective', async () => {
    const { service } = createService(userWithRole({ permissions: [TenantPermission.ProductsRead] }));

    const allowed = await service.hasAnyPermission(subject, [
      TenantPermission.InventoryManage,
      TenantPermission.ProductsRead,
    ]);
    const denied = await service.hasAnyPermission(subject, [
      TenantPermission.InventoryManage,
      TenantPermission.ProductsManage,
    ]);
    const empty = await service.hasAnyPermission(subject, []);

    expect(allowed._unsafeUnwrap()).toBe(true);
    expect(denied._unsafeUnwrap()).toBe(false);
    expect(empty._unsafeUnwrap()).toBe(false);
  });

  it('requires every requested permission for all-of checks', async () => {
    const { service } = createService(
      userWithRole({ permissions: [TenantPermission.ProductsRead, TenantPermission.InventoryManage] }),
    );

    const allowed = await service.hasAllPermissions(subject, [
      TenantPermission.ProductsRead,
      TenantPermission.InventoryManage,
    ]);
    const denied = await service.hasAllPermissions(subject, [
      TenantPermission.ProductsRead,
      TenantPermission.ProductsManage,
    ]);

    expect(allowed._unsafeUnwrap()).toBe(true);
    expect(denied._unsafeUnwrap()).toBe(false);
  });

  it('allows Administrator for arbitrary valid all-of requirements', async () => {
    const { service } = createService(userWithRole({ systemRole: V2TenantSystemRole.ADMIN }));

    const result = await service.hasAllPermissions(subject, [
      TenantPermission.TeamManage,
      TenantPermission.InventoryOwnershipManage,
      TenantPermission.RentalsCancel,
    ]);

    expect(result._unsafeUnwrap()).toBe(true);
  });

  it('resolves current persistence state for every all-of check', async () => {
    const fixture = createService(userWithRole({ permissions: [TenantPermission.ProductsRead] }));

    const first = await fixture.service.hasAllPermissions(subject, [TenantPermission.ProductsRead]);
    fixture.setUser(userWithRole({ permissions: [TenantPermission.InventoryManage] }));
    const second = await fixture.service.hasAllPermissions(subject, [TenantPermission.ProductsRead]);

    expect(first._unsafeUnwrap()).toBe(true);
    expect(second._unsafeUnwrap()).toBe(false);
    expect(fixture.findFirst).toHaveBeenCalledTimes(2);
  });

  it('fails explicitly when persistence contains an unknown permission', async () => {
    const { service } = createService(userWithRole({ permissions: ['products.unknown'] }));

    const result = await service.getEffectivePermissions(subject);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toMatchObject({
      code: 'TenantAuthorizationStateInvalid',
      cause: expect.any(TypeError),
    });
  });

  it('fails explicitly when the user does not exist', async () => {
    const { service } = createService(null);

    const result = await service.getEffectivePermissions(subject);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe('TenantAuthorizationSubjectNotFound');
  });

  it('uses both tenant and user identifiers and does not select the legacy role', async () => {
    const { service, findFirst } = createService(null);

    await service.getEffectivePermissions(subject);

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: subject.tenantUserId, tenantId: subject.tenantId },
      select: {
        roleId: true,
        tenantRole: {
          select: {
            id: true,
            name: true,
            systemRole: true,
          },
        },
      },
    });
  });

  it('loads custom-role permissions through the tenant-scoped parent role', async () => {
    const { service, findMany } = createService(
      userWithRole({ roleId: 'role-1', permissions: [TenantPermission.ProductsRead] }),
    );

    await service.getEffectivePermissions(subject);

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        roleId: 'role-1',
        role: { tenantId: subject.tenantId },
      },
      select: { permission: true },
    });
  });

  it('does not map permission-query infrastructure failures to invalid authorization state', async () => {
    const infrastructureError = new Error('database unavailable');
    const fixture = createService(userWithRole());
    fixture.findMany.mockRejectedValueOnce(infrastructureError);

    await expect(fixture.service.getEffectivePermissions(subject)).rejects.toBe(infrastructureError);
  });

  it('rejects a foreign-tenant subject as not found', async () => {
    const { service, findFirst } = createService(null);

    const result = await service.getEffectivePermissions({ tenantId: 'tenant-2', tenantUserId: 'user-1' });

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'user-1', tenantId: 'tenant-2' } }));
    expect(result._unsafeUnwrapErr().code).toBe('TenantAuthorizationSubjectNotFound');
  });

  it("always follows the user's current role relationship", async () => {
    const fixture = createService(userWithRole({ roleId: 'role-a', permissions: [TenantPermission.ProductsRead] }));

    const first = await fixture.service.getEffectivePermissions(subject);
    fixture.setUser(userWithRole({ roleId: 'role-b', permissions: [TenantPermission.TeamManage] }));
    const second = await fixture.service.getEffectivePermissions(subject);

    expect(first._unsafeUnwrap()).toMatchObject({ roleId: 'role-a', permissions: [TenantPermission.ProductsRead] });
    expect(second._unsafeUnwrap()).toMatchObject({ roleId: 'role-b', permissions: [TenantPermission.TeamManage] });
  });

  it('reflects persisted permission changes on every subsequent resolution', async () => {
    const fixture = createService(userWithRole({ permissions: [TenantPermission.ProductsRead] }));

    const first = await fixture.service.getEffectivePermissions(subject);
    fixture.setUser(userWithRole({ permissions: [TenantPermission.InventoryManage] }));
    const second = await fixture.service.getEffectivePermissions(subject);

    expect(first._unsafeUnwrap().permissions).toEqual([TenantPermission.ProductsRead]);
    expect(second._unsafeUnwrap().permissions).toEqual([TenantPermission.InventoryManage]);
    expect(fixture.findFirst).toHaveBeenCalledTimes(2);
  });
});
