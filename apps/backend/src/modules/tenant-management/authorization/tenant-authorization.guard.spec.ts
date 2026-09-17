import { TenantPermission } from '@repo/api-contracts';
import {
  ExecutionContext,
  ForbiddenException,
  type Type,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { err, ok } from 'neverthrow';

import { IS_PUBLIC_KEY } from 'src/core/decorators/public.decorator';
import { AUTH_ACTOR_TYPES, type AuthActor } from 'src/modules/tenant-management/auth/shared/auth.types';

import {
  AuthorizationExempt,
  ConditionalAuthorization,
  RequireAllPermissions,
  RequireAnyPermission,
  RequirePermission,
} from './tenant-authorization.decorators';
import { TenantAuthorizationHttpEnforcer } from './tenant-authorization-http.enforcer';
import { TenantAuthorization } from './tenant-authorization.public-api';
import { TenantAuthorizationGuard } from './tenant-authorization.guard';

describe('TenantAuthorizationGuard', () => {
  // SAFETY: This fixture supplies every field read by the unit under test; omitted members are outside this test path.
  const tenantUser = {
    actorType: AUTH_ACTOR_TYPES.TENANT_USER,
    id: 'user-1',
    tenantId: 'tenant-1',
  } as AuthActor;

  function fixture(actor: AuthActor | undefined = tenantUser, authenticated = true) {
    // SAFETY: This focused test double implements every member exercised by the subject; unimplemented framework or service members are never accessed.
    const tenantAuthorization = {
      getEffectivePermissions: jest.fn(),
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasAllPermissions: jest.fn(),
    } as jest.Mocked<TenantAuthorization>;
    const guard = new TenantAuthorizationGuard(
      new Reflector(),
      new TenantAuthorizationHttpEnforcer(tenantAuthorization),
    );

    return {
      guard,
      tenantAuthorization,
      contextFor(handler: () => void, controller: Type<unknown> = class TestController {}) {
        const request = {
          user: actor,
          isAuthenticated: jest.fn().mockReturnValue(authenticated),
        };
        // SAFETY: This focused test double implements every member exercised by the subject; unimplemented framework or service members are never accessed.
        const context = {
          getHandler: () => handler,
          getClass: () => controller,
          switchToHttp: () => ({ getRequest: () => request }),
        } as ExecutionContext;

        return { context, request };
      },
    };
  }

  it('allows when the required permission is present and delegates with trusted actor IDs', async () => {
    const test = fixture();
    test.tenantAuthorization.hasPermission.mockResolvedValue(ok(true));
    const handler = () => undefined;
    RequirePermission(TenantPermission.ProductsRead)(handler);

    await expect(test.guard.canActivate(test.contextFor(handler).context)).resolves.toBe(true);
    expect(test.tenantAuthorization.hasPermission).toHaveBeenCalledWith(
      { tenantId: 'tenant-1', tenantUserId: 'user-1' },
      TenantPermission.ProductsRead,
    );
    expect(test.tenantAuthorization.hasAnyPermission).not.toHaveBeenCalled();
  });

  it('denies with 403 when the required permission is absent', async () => {
    const test = fixture();
    test.tenantAuthorization.hasPermission.mockResolvedValue(ok(false));
    const handler = () => undefined;
    RequirePermission(TenantPermission.ProductsManage)(handler);

    await expect(test.guard.canActivate(test.contextFor(handler).context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows any-of when one permission matches', async () => {
    const test = fixture();
    test.tenantAuthorization.hasAnyPermission.mockResolvedValue(ok(true));
    const handler = () => undefined;
    RequireAnyPermission(TenantPermission.ProductsRead, TenantPermission.InventoryRead)(handler);

    await expect(test.guard.canActivate(test.contextFor(handler).context)).resolves.toBe(true);
    expect(test.tenantAuthorization.hasAnyPermission).toHaveBeenCalledWith(
      { tenantId: 'tenant-1', tenantUserId: 'user-1' },
      [TenantPermission.ProductsRead, TenantPermission.InventoryRead],
    );
  });

  it('denies with 403 when no any-of permission matches', async () => {
    const test = fixture();
    test.tenantAuthorization.hasAnyPermission.mockResolvedValue(ok(false));
    const handler = () => undefined;
    RequireAnyPermission(TenantPermission.ProductsRead, TenantPermission.InventoryRead)(handler);

    await expect(test.guard.canActivate(test.contextFor(handler).context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows all-of when every permission is present', async () => {
    const test = fixture();
    test.tenantAuthorization.hasAllPermissions.mockResolvedValue(ok(true));
    const handler = () => undefined;
    RequireAllPermissions(TenantPermission.ProductsManage, TenantPermission.ProductsAvailabilityManage)(handler);

    await expect(test.guard.canActivate(test.contextFor(handler).context)).resolves.toBe(true);
    expect(test.tenantAuthorization.hasAllPermissions).toHaveBeenCalledWith(
      { tenantId: 'tenant-1', tenantUserId: 'user-1' },
      [TenantPermission.ProductsManage, TenantPermission.ProductsAvailabilityManage],
    );
  });

  it('denies with 403 when one all-of permission is absent', async () => {
    const test = fixture();
    test.tenantAuthorization.hasAllPermissions.mockResolvedValue(ok(false));
    const handler = () => undefined;
    RequireAllPermissions(TenantPermission.ProductsManage, TenantPermission.ProductsAvailabilityManage)(handler);

    await expect(test.guard.canActivate(test.contextFor(handler).context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an exempt declaration without evaluating permissions', async () => {
    const test = fixture();
    const handler = () => undefined;
    AuthorizationExempt()(handler);

    await expect(test.guard.canActivate(test.contextFor(handler).context)).resolves.toBe(true);
    expect(test.tenantAuthorization.hasPermission).not.toHaveBeenCalled();
    expect(test.tenantAuthorization.hasAnyPermission).not.toHaveBeenCalled();
    expect(test.tenantAuthorization.hasAllPermissions).not.toHaveBeenCalled();
  });

  it('allows conditional authorization to proceed without evaluating permissions', async () => {
    const test = fixture();
    const handler = () => undefined;
    ConditionalAuthorization()(handler);

    await expect(test.guard.canActivate(test.contextFor(handler).context)).resolves.toBe(true);
    expect(test.tenantAuthorization.hasPermission).not.toHaveBeenCalled();
    expect(test.tenantAuthorization.hasAnyPermission).not.toHaveBeenCalled();
    expect(test.tenantAuthorization.hasAllPermissions).not.toHaveBeenCalled();
  });

  it('denies an authenticated tenant user with 403 when authorization metadata is missing', async () => {
    const test = fixture();
    const handler = () => undefined;

    await expect(test.guard.canActivate(test.contextFor(handler).context)).rejects.toMatchObject({
      response: {
        statusCode: 403,
        message: 'Tenant authorization metadata is required.',
      },
    });
    expect(test.tenantAuthorization.hasPermission).not.toHaveBeenCalled();
    expect(test.tenantAuthorization.hasAnyPermission).not.toHaveBeenCalled();
    expect(test.tenantAuthorization.hasAllPermissions).not.toHaveBeenCalled();
  });

  it('allows an authenticated tenant customer when tenant authorization metadata is missing', async () => {
    // SAFETY: This fixture supplies every field read by the unit under test; omitted members are outside this test path.
    const customer = {
      actorType: AUTH_ACTOR_TYPES.TENANT_CUSTOMER,
      id: 'customer-1',
      tenantId: 'tenant-1',
    } as AuthActor;
    const test = fixture(customer);
    const handler = () => undefined;

    await expect(test.guard.canActivate(test.contextFor(handler).context)).resolves.toBe(true);
    expect(test.tenantAuthorization.hasPermission).not.toHaveBeenCalled();
    expect(test.tenantAuthorization.hasAnyPermission).not.toHaveBeenCalled();
    expect(test.tenantAuthorization.hasAllPermissions).not.toHaveBeenCalled();
  });

  it('returns 401 when authorization metadata and the authenticated actor are missing', async () => {
    const test = fixture(undefined, false);
    const handler = () => undefined;

    await expect(test.guard.canActivate(test.contextFor(handler).context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('fails a missing authorization subject closed as stale authentication', async () => {
    const test = fixture();
    test.tenantAuthorization.hasPermission.mockResolvedValue(
      err({ code: 'TenantAuthorizationSubjectNotFound', message: 'internal detail' }),
    );
    const handler = () => undefined;
    RequirePermission(TenantPermission.ProductsRead)(handler);

    await expect(test.guard.canActivate(test.contextFor(handler).context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('fails invalid authorization state closed as a controlled server error', async () => {
    const test = fixture();
    test.tenantAuthorization.hasPermission.mockResolvedValue(
      err({ code: 'TenantAuthorizationStateInvalid', message: 'internal detail' }),
    );
    const handler = () => undefined;
    RequirePermission(TenantPermission.ProductsRead)(handler);

    await expect(test.guard.canActivate(test.contextFor(handler).context)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('fails safely when a tenant-customer actor reaches a declared requirement', async () => {
    // SAFETY: This fixture supplies every field read by the unit under test; omitted members are outside this test path.
    const customer = {
      actorType: AUTH_ACTOR_TYPES.TENANT_CUSTOMER,
      id: 'customer-1',
      tenantId: 'tenant-1',
    } as AuthActor;
    const test = fixture(customer);
    const handler = () => undefined;
    RequirePermission(TenantPermission.ProductsRead)(handler);

    await expect(test.guard.canActivate(test.contextFor(handler).context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(test.tenantAuthorization.hasPermission).not.toHaveBeenCalled();
  });

  it('defensively returns 401 when a declared requirement is reached without authentication', async () => {
    const test = fixture(undefined, false);
    const handler = () => undefined;
    RequirePermission(TenantPermission.ProductsRead)(handler);

    await expect(test.guard.canActivate(test.contextFor(handler).context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('preserves public-route behavior even when permission metadata is present', async () => {
    const test = fixture(undefined, false);
    const handler = () => undefined;
    RequirePermission(TenantPermission.ProductsRead)(handler);
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);

    await expect(test.guard.canActivate(test.contextFor(handler).context)).resolves.toBe(true);
    expect(test.tenantAuthorization.hasPermission).not.toHaveBeenCalled();
  });

  it('never reads the legacy scalar role', async () => {
    // SAFETY: This fixture supplies every field read by the unit under test; omitted members are outside this test path.
    const actor = {
      actorType: AUTH_ACTOR_TYPES.TENANT_USER,
      id: 'user-1',
      tenantId: 'tenant-1',
      get role(): never {
        throw new Error('legacy role was read');
      },
    } as AuthActor;
    const test = fixture(actor);
    test.tenantAuthorization.hasPermission.mockResolvedValue(ok(true));
    const handler = () => undefined;
    RequirePermission(TenantPermission.ProductsRead)(handler);

    await expect(test.guard.canActivate(test.contextFor(handler).context)).resolves.toBe(true);
  });
});
