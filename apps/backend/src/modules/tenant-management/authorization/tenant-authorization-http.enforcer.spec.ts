import { ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { TenantPermission } from '@repo/api-contracts';
import { err, ok } from 'neverthrow';

import { AUTH_ACTOR_TYPES, type AuthActor } from 'src/modules/tenant-management/auth/shared/auth.types';

import { TenantAuthorizationHttpEnforcer } from './tenant-authorization-http.enforcer';
import { TenantAuthorization } from './tenant-authorization.public-api';

describe('TenantAuthorizationHttpEnforcer', () => {
  const tenantUser = {
    actorType: AUTH_ACTOR_TYPES.TENANT_USER,
    id: 'user-1',
    tenantId: 'tenant-1',
  } as AuthActor;

  function fixture() {
    const tenantAuthorization = {
      getEffectivePermissions: jest.fn(),
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasAllPermissions: jest.fn(),
    } as jest.Mocked<TenantAuthorization>;

    return {
      tenantAuthorization,
      enforcer: new TenantAuthorizationHttpEnforcer(tenantAuthorization),
    };
  }

  it.each([
    ['allows', true, undefined],
    ['denies', false, ForbiddenException],
  ] as const)('%s ONE requirements', async (_label, allowed, exception) => {
    const test = fixture();
    test.tenantAuthorization.hasPermission.mockResolvedValue(ok(allowed));

    const action = test.enforcer.requirePermission(tenantUser, TenantPermission.ProductsRead);

    if (exception) await expect(action).rejects.toBeInstanceOf(exception);
    else await expect(action).resolves.toBeUndefined();
  });

  it.each([
    ['allows', true, undefined],
    ['denies', false, ForbiddenException],
  ] as const)('%s ANY requirements', async (_label, allowed, exception) => {
    const test = fixture();
    test.tenantAuthorization.hasAnyPermission.mockResolvedValue(ok(allowed));

    const action = test.enforcer.requireAnyPermissions(tenantUser, [
      TenantPermission.ProductsRead,
      TenantPermission.InventoryRead,
    ]);

    if (exception) await expect(action).rejects.toBeInstanceOf(exception);
    else await expect(action).resolves.toBeUndefined();
  });

  it.each([
    ['allows', true, undefined],
    ['denies', false, ForbiddenException],
  ] as const)('%s ALL requirements', async (_label, allowed, exception) => {
    const test = fixture();
    test.tenantAuthorization.hasAllPermissions.mockResolvedValue(ok(allowed));

    const action = test.enforcer.requireAllPermissions(tenantUser, [
      TenantPermission.ProductsManage,
      TenantPermission.ProductsAvailabilityManage,
    ]);

    if (exception) await expect(action).rejects.toBeInstanceOf(exception);
    else await expect(action).resolves.toBeUndefined();
  });

  it('rejects a non-tenant-user actor with 403 without evaluating permissions', async () => {
    const test = fixture();
    const customer = {
      actorType: AUTH_ACTOR_TYPES.TENANT_CUSTOMER,
      id: 'customer-1',
      tenantId: 'tenant-1',
    } as AuthActor;

    await expect(test.enforcer.requirePermission(customer, TenantPermission.ProductsRead)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(test.tenantAuthorization.hasPermission).not.toHaveBeenCalled();
  });

  it('maps a missing authorization subject to 401 without exposing details', async () => {
    const test = fixture();
    test.tenantAuthorization.hasPermission.mockResolvedValue(
      err({ code: 'TenantAuthorizationSubjectNotFound', message: 'sensitive internal detail' }),
    );

    await expect(test.enforcer.requirePermission(tenantUser, TenantPermission.ProductsRead)).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        response: expect.not.stringContaining('sensitive internal detail'),
      }),
    );
  });

  it('maps invalid authorization state to a generic controlled 500', async () => {
    const test = fixture();
    test.tenantAuthorization.hasPermission.mockResolvedValue(
      err({ code: 'TenantAuthorizationStateInvalid', message: 'sensitive internal detail' }),
    );

    const action = test.enforcer.requirePermission(tenantUser, TenantPermission.ProductsRead);
    await expect(action).rejects.toBeInstanceOf(InternalServerErrorException);
    await expect(action).rejects.toMatchObject({
      response: expect.not.stringContaining('sensitive internal detail'),
    });
  });

  it('derives the authorization subject only from authenticated actor IDs', async () => {
    const test = fixture();
    test.tenantAuthorization.hasPermission.mockResolvedValue(ok(true));
    const actor = {
      actorType: AUTH_ACTOR_TYPES.TENANT_USER,
      id: 'trusted-user',
      tenantId: 'trusted-tenant',
      get role(): never {
        throw new Error('legacy role was read');
      },
    } as AuthActor;

    await test.enforcer.requirePermission(actor, TenantPermission.ProductsRead);

    expect(test.tenantAuthorization.hasPermission).toHaveBeenCalledWith(
      { tenantId: 'trusted-tenant', tenantUserId: 'trusted-user' },
      TenantPermission.ProductsRead,
    );
  });
});
