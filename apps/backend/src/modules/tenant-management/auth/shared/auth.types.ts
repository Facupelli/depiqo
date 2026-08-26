import { V2RentalCustomerOnboardingStatus, V2UserRole, V2UserStatus } from 'src/generated/prisma/enums';

export const AUTH_ACTOR_TYPES = {
  TENANT_USER: 'TENANT_USER',
  TENANT_CUSTOMER: 'TENANT_CUSTOMER',
} as const;

export type AuthActorType = (typeof AUTH_ACTOR_TYPES)[keyof typeof AUTH_ACTOR_TYPES];

export type TenantUserAuthActor = {
  actorType: typeof AUTH_ACTOR_TYPES.TENANT_USER;
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: V2UserRole;
  status: V2UserStatus;
  emailVerifiedAt: Date | null;
  sessionVersion: number;
};

export type TenantCustomerAuthActor = {
  actorType: typeof AUTH_ACTOR_TYPES.TENANT_CUSTOMER;
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  onboardingStatus: V2RentalCustomerOnboardingStatus;
  emailVerifiedAt: Date | null;
  sessionVersion: number;
};

export type AuthActor = TenantUserAuthActor | TenantCustomerAuthActor;

export type AuthUser = TenantUserAuthActor;
export type AuthCustomer = TenantCustomerAuthActor;

export type AuthRequestMetadata = {
  ip?: string | null;
  userAgent?: string | null;
};

type UserLike = {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: V2UserRole;
  status: V2UserStatus;
  emailVerifiedAt: Date | null;
  sessionVersion: number;
};

type CustomerLike = {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  onboardingStatus: V2RentalCustomerOnboardingStatus;
  emailVerifiedAt: Date | null;
  sessionVersion: number;
};

export function toAuthUser(user: UserLike): AuthUser {
  return {
    actorType: AUTH_ACTOR_TYPES.TENANT_USER,
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    sessionVersion: user.sessionVersion,
  };
}

export function toAuthCustomer(customer: CustomerLike): AuthCustomer {
  return {
    actorType: AUTH_ACTOR_TYPES.TENANT_CUSTOMER,
    id: customer.id,
    tenantId: customer.tenantId,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    avatarUrl: customer.avatarUrl,
    onboardingStatus: customer.onboardingStatus,
    emailVerifiedAt: customer.emailVerifiedAt,
    sessionVersion: customer.sessionVersion,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
