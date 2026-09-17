import type { TenantPermission } from '@repo/api-contracts';
import type { Result } from 'neverthrow';

export interface TenantAuthorizationSubject {
  readonly tenantId: string;
  readonly tenantUserId: string;
}

export interface EffectiveTenantPermissions {
  readonly roleId: string;
  readonly roleName: string;
  readonly systemRole: 'ADMIN' | null;
  readonly permissions: readonly TenantPermission[];
}

export type TenantAuthorizationError =
  | {
      readonly code: 'TenantAuthorizationSubjectNotFound';
      readonly message: string;
    }
  | {
      readonly code: 'TenantAuthorizationStateInvalid';
      readonly message: string;
      readonly cause?: unknown;
    };

export abstract class TenantAuthorization {
  abstract getEffectivePermissions(
    subject: TenantAuthorizationSubject,
  ): Promise<Result<EffectiveTenantPermissions, TenantAuthorizationError>>;

  abstract hasPermission(
    subject: TenantAuthorizationSubject,
    permission: TenantPermission,
  ): Promise<Result<boolean, TenantAuthorizationError>>;

  abstract hasAnyPermission(
    subject: TenantAuthorizationSubject,
    permissions: readonly TenantPermission[],
  ): Promise<Result<boolean, TenantAuthorizationError>>;

  abstract hasAllPermissions(
    subject: TenantAuthorizationSubject,
    permissions: readonly [TenantPermission, ...TenantPermission[]],
  ): Promise<Result<boolean, TenantAuthorizationError>>;
}
