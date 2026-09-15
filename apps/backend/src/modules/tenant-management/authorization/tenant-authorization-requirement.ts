import type { TenantPermission } from '@repo/api-contracts';

export const TENANT_AUTHORIZATION_REQUIREMENT_KEY = 'tenantAuthorizationRequirement';

export type TenantAuthorizationRequirement =
  | {
      readonly type: 'ONE';
      readonly permission: TenantPermission;
    }
  | {
      readonly type: 'ANY';
      readonly permissions: readonly [TenantPermission, ...TenantPermission[]];
    }
  | {
      readonly type: 'EXEMPT';
    };
