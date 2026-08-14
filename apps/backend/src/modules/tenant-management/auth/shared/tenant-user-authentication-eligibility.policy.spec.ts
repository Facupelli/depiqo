import { V2TenantStatus, V2UserStatus } from 'src/generated/prisma/enums';

import { isTenantUserAuthenticationEligible } from './tenant-user-authentication-eligibility.policy';

describe('isTenantUserAuthenticationEligible', () => {
  it('accepts an active user under an active, non-deleted tenant', () => {
    expect(
      isTenantUserAuthenticationEligible({
        userStatus: V2UserStatus.ACTIVE,
        tenantStatus: V2TenantStatus.ACTIVE,
        tenantDeletedAt: null,
      }),
    ).toBe(true);
  });

  it.each([V2UserStatus.SUSPENDED, V2UserStatus.DELETED])('rejects a %s user', (userStatus) => {
    expect(
      isTenantUserAuthenticationEligible({
        userStatus,
        tenantStatus: V2TenantStatus.ACTIVE,
        tenantDeletedAt: null,
      }),
    ).toBe(false);
  });

  it('rejects an active user under a disabled tenant', () => {
    expect(
      isTenantUserAuthenticationEligible({
        userStatus: V2UserStatus.ACTIVE,
        tenantStatus: V2TenantStatus.DISABLED,
        tenantDeletedAt: null,
      }),
    ).toBe(false);
  });

  it('rejects an active user under a soft-deleted tenant', () => {
    expect(
      isTenantUserAuthenticationEligible({
        userStatus: V2UserStatus.ACTIVE,
        tenantStatus: V2TenantStatus.ACTIVE,
        tenantDeletedAt: new Date(),
      }),
    ).toBe(false);
  });
});
