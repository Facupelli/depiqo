import { TenantPermission } from '@repo/api-contracts';
import {
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { err, ok } from 'neverthrow';

import { IS_PUBLIC_KEY } from 'src/core/decorators/public.decorator';
import { AUTH_ACTOR_TYPES, type AuthActor } from 'src/modules/tenant-management/auth/shared/auth.types';

import { RequireAnyPermission, RequirePermission, AuthorizationExempt } from './tenant-authorization.decorators';
import { TenantAuthorization } from './tenant-authorization.public-api';
import { TenantAuthorizationGuard } from './tenant-authorization.guard';

describe('TenantAuthorizationGuard', () => {
  const tenantUser = {
    actorType: AUTH_ACTOR_TYPES.TENANT_USER,
    id: 'user-1',
    tenantId: 'tenant-1',
  } as AuthActor;

  function fixture(actor: AuthActor | undefined = tenantUser, authenticated = true) {
    const tenantAuthorization = {
      getEffectivePermissions: jest.fn(),
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
    } as unknown as jest.Mocked<TenantAuthorization>;
    const guard = new TenantAuthorizationGuard(new Reflector(), tenantAuthorization);

    return {
      guard,
      tenantAuthorization,
      contextFor(handler: () => void, controller: object = class TestController {}) {
        const request = {
          user: actor,
          isAuthenticated: jest.fn().mockReturnValue(authenticated),
        };
        const context = {
          getHandler: () => handler,
          getClass: () => controller,
          switchToHttp: () => ({ getRequest: () => request }),
        } as unknown as ExecutionContext;

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

  it('allows an exempt declaration without evaluating permissions', async () => {
    const test = fixture();
    const handler = () => undefined;
    AuthorizationExempt()(handler);

    await expect(test.guard.canActivate(test.contextFor(handler).context)).resolves.toBe(true);
    expect(test.tenantAuthorization.hasPermission).not.toHaveBeenCalled();
    expect(test.tenantAuthorization.hasAnyPermission).not.toHaveBeenCalled();
  });

  it('allows missing metadata during transition mode', async () => {
    const test = fixture(undefined, false);
    const handler = () => undefined;

    await expect(test.guard.canActivate(test.contextFor(handler).context)).resolves.toBe(true);
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
    const actor = {
      actorType: AUTH_ACTOR_TYPES.TENANT_USER,
      id: 'user-1',
      tenantId: 'tenant-1',
      get role(): never {
        throw new Error('legacy role was read');
      },
    } as unknown as AuthActor;
    const test = fixture(actor);
    test.tenantAuthorization.hasPermission.mockResolvedValue(ok(true));
    const handler = () => undefined;
    RequirePermission(TenantPermission.ProductsRead)(handler);

    await expect(test.guard.canActivate(test.contextFor(handler).context)).resolves.toBe(true);
  });
});
