import { TenantPermission } from '@repo/api-contracts';
import { Reflector } from '@nestjs/core';

import {
  AuthorizationExempt,
  ConditionalAuthorization,
  RequireAllPermissions,
  RequireAnyPermission,
  RequirePermission,
} from './tenant-authorization.decorators';
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

  it('stores every all-of permission', () => {
    @RequireAllPermissions(TenantPermission.ProductsManage, TenantPermission.ProductsAvailabilityManage)
    class TestController {}

    expect(requirementOn(TestController)).toEqual({
      type: 'ALL',
      permissions: [TenantPermission.ProductsManage, TenantPermission.ProductsAvailabilityManage],
    });
  });

  it('resolves method metadata ahead of class metadata', () => {
    @RequirePermission(TenantPermission.ProductsRead)
    class TestController {
      @RequireAllPermissions(TenantPermission.ProductsManage, TenantPermission.ProductsAvailabilityManage)
      handler() {}
    }

    const requirement = reflector.getAllAndOverride<TenantAuthorizationRequirement>(
      TENANT_AUTHORIZATION_REQUIREMENT_KEY,
      [TestController.prototype.handler, TestController],
    );

    expect(requirement).toEqual({
      type: 'ALL',
      permissions: [TenantPermission.ProductsManage, TenantPermission.ProductsAvailabilityManage],
    });
  });

  it('stores an explicit exemption', () => {
    @AuthorizationExempt()
    class TestController {}

    expect(requirementOn(TestController)).toEqual({ type: 'EXEMPT' });
  });

  it('stores conditional authorization distinctly from an exemption', () => {
    @ConditionalAuthorization()
    class ConditionalController {}

    @AuthorizationExempt()
    class ExemptController {}

    expect(requirementOn(ConditionalController)).toEqual({ type: 'CONDITIONAL' });
    expect(requirementOn(ConditionalController)).not.toEqual(requirementOn(ExemptController));
  });

  it('rejects an empty any-of declaration at runtime', () => {
    // SAFETY: The preceding test setup and assertions establish this value shape before the test inspects it.
    expect(() => (RequireAnyPermission as (...permissions: TenantPermission[]) => ClassDecorator)()).toThrow(
      'RequireAnyPermission requires at least one tenant permission.',
    );
  });

  it('rejects an empty all-of declaration at runtime', () => {
    // SAFETY: The preceding test setup and assertions establish this value shape before the test inspects it.
    expect(() => (RequireAllPermissions as (...permissions: TenantPermission[]) => ClassDecorator)()).toThrow(
      'RequireAllPermissions requires at least one tenant permission.',
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

  function requirementOn(target: Parameters<ClassDecorator>[0]): TenantAuthorizationRequirement | undefined {
    // SAFETY: This focused test double implements every member exercised by the subject; unimplemented framework or service members are never accessed.
    return Reflect.getOwnMetadata(TENANT_AUTHORIZATION_REQUIREMENT_KEY, target) as
      | TenantAuthorizationRequirement
      | undefined;
  }
});
