import { TenantPermission } from '@repo/api-contracts';
import { Reflector } from '@nestjs/core';

import { AuthorizationExempt, RequireAnyPermission, RequirePermission } from './tenant-authorization.decorators';
import {
  TENANT_AUTHORIZATION_REQUIREMENT_KEY,
  type TenantAuthorizationRequirement,
} from './tenant-authorization-requirement';

describe('tenant authorization decorators', () => {
  const reflector = new Reflector();

  it('stores a one-permission requirement', () => {
    @RequirePermission(TenantPermission.RentalsConfirm)
    class TestController {}

    expect(requirementOn(TestController)).toEqual({
      type: 'ONE',
      permission: TenantPermission.RentalsConfirm,
    });
  });

  it('stores every any-of permission', () => {
    @RequireAnyPermission(TenantPermission.RentalsProposalsManage, TenantPermission.ProductsRead)
    class TestController {}

    expect(requirementOn(TestController)).toEqual({
      type: 'ANY',
      permissions: [TenantPermission.RentalsProposalsManage, TenantPermission.ProductsRead],
    });
  });

  it('resolves method metadata ahead of class metadata', () => {
    @RequirePermission(TenantPermission.ProductsRead)
    class TestController {
      @RequirePermission(TenantPermission.TeamManage)
      handler() {}
    }

    const requirement = reflector.getAllAndOverride<TenantAuthorizationRequirement>(
      TENANT_AUTHORIZATION_REQUIREMENT_KEY,
      [TestController.prototype.handler, TestController],
    );

    expect(requirement).toEqual({ type: 'ONE', permission: TenantPermission.TeamManage });
  });

  it('stores an explicit exemption', () => {
    @AuthorizationExempt()
    class TestController {}

    expect(requirementOn(TestController)).toEqual({ type: 'EXEMPT' });
  });

  it('rejects an empty any-of declaration at runtime', () => {
    expect(() => (RequireAnyPermission as (...permissions: TenantPermission[]) => ClassDecorator)()).toThrow(
      'RequireAnyPermission requires at least one tenant permission.',
    );
  });

  it('rejects conflicting declarations on the same target', () => {
    expect(() => {
      @AuthorizationExempt()
      @RequirePermission(TenantPermission.ProductsRead)
      class TestController {}

      return TestController;
    }).toThrow('Only one tenant authorization declaration may be applied to the same target.');
  });

  function requirementOn(target: object): TenantAuthorizationRequirement | undefined {
    return Reflect.getOwnMetadata(TENANT_AUTHORIZATION_REQUIREMENT_KEY, target) as
      | TenantAuthorizationRequirement
      | undefined;
  }
});
