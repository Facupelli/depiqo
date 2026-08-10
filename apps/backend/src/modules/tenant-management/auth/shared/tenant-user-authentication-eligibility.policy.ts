import { V2TenantStatus, V2UserStatus } from 'src/generated/prisma/enums';

export type TenantUserAuthenticationLifecycle = {
  userStatus: V2UserStatus;
  tenantStatus: V2TenantStatus;
  tenantDeletedAt: Date | null;
};

export function isTenantUserAuthenticationEligible(input: TenantUserAuthenticationLifecycle): boolean {
  return (
    input.userStatus === V2UserStatus.ACTIVE &&
    input.tenantStatus === V2TenantStatus.ACTIVE &&
    input.tenantDeletedAt === null
  );
}
