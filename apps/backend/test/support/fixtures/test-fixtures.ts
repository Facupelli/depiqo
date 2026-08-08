import type { PrismaService } from 'src/core/database/prisma.service';
import { PasswordService } from 'src/modules/tenant-management/auth/shared/password/password.service';
import { TenantConfig } from 'src/modules/tenant-management/domain/value-objects/tenant-config.value-object';
import type { Prisma } from 'src/generated/prisma/client';
import type {
  V2Branch,
  V2LocalCredential,
  V2RentalCustomer,
  V2Tenant,
  V2TenantUser,
} from 'src/generated/prisma/client';
import { randomUUID } from 'node:crypto';

type TenantOverrides = Partial<
  Omit<Prisma.V2TenantCreateInput, 'branding' | 'branches' | 'contractSigners' | 'domains' | 'rentalCustomers'>
>;
type TenantUserOverrides = Partial<Omit<Prisma.V2TenantUserUncheckedCreateInput, 'tenantId'>>;
type RentalCustomerOverrides = Partial<
  Omit<Prisma.V2RentalCustomerUncheckedCreateInput, 'tenantId' | 'authIdentities' | 'profile' | 'tenant'>
>;
type BranchOverrides = Partial<Omit<Prisma.V2BranchUncheckedCreateInput, 'tenantId' | 'schedules' | 'tenant'>>;

export type CreateTenantUserInput = {
  tenantId: string;
  password?: string;
  overrides?: TenantUserOverrides;
};

export type CreateRentalCustomerInput = {
  tenantId: string;
  password?: string;
  overrides?: RentalCustomerOverrides;
};

export type CreateBranchInput = {
  tenantId: string;
  overrides?: BranchOverrides;
};

export type TestFixtures = {
  createTenant(overrides?: TenantOverrides): Promise<V2Tenant>;
  createTenantUser(input: CreateTenantUserInput): Promise<{
    user: V2TenantUser;
    credential: V2LocalCredential;
    password: string;
  }>;
  createRentalCustomer(input: CreateRentalCustomerInput): Promise<{
    customer: V2RentalCustomer;
    password: string;
  }>;
  createBranch(input: CreateBranchInput): Promise<V2Branch>;
};

export function createTestFixtures(prisma: PrismaService, passwordService = new PasswordService()): TestFixtures {
  return {
    createTenant: (overrides = {}) => {
      const unique = randomUUID();

      return prisma.client.v2Tenant.create({
        data: {
          name: `Test tenant ${unique}`,
          slug: `test-tenant-${unique}`,
          config: TenantConfig.default().toPlainObject() as Prisma.InputJsonValue,
          ...overrides,
        },
      });
    },

    createTenantUser: async ({ tenantId, password = 'test-password', overrides = {} }) => {
      const passwordData = await passwordService.hashPassword(password);

      return prisma.client.$transaction(async (tx) => {
        const tenant = await tx.v2Tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
        if (!tenant) {
          throw new Error(`Cannot create a tenant user for nonexistent tenant ${tenantId}.`);
        }

        const unique = randomUUID();
        const user = await tx.v2TenantUser.create({
          data: {
            tenantId,
            email: `user-${unique}@test.local`,
            name: `Test User ${unique}`,
            ...overrides,
          },
        });
        const credential = await tx.v2LocalCredential.create({
          data: {
            userId: user.id,
            passwordHash: passwordData.hash,
            passwordAlgorithm: passwordData.algorithm,
          },
        });

        return { user, credential, password };
      });
    },

    createRentalCustomer: async ({ tenantId, password = 'test-password', overrides = {} }) => {
      const passwordData = await passwordService.hashPassword(password);
      const unique = randomUUID();
      const customer = await prisma.client.v2RentalCustomer.create({
        data: {
          tenantId,
          email: `customer-${unique}@test.local`,
          firstName: 'Test',
          lastName: `Customer ${unique}`,
          passwordHash: passwordData.hash,
          ...overrides,
        },
      });

      return { customer, password };
    },

    createBranch: ({ tenantId, overrides = {} }) => {
      const unique = randomUUID();

      return prisma.client.v2Branch.create({
        data: {
          tenantId,
          name: `Test branch ${unique}`,
          ...overrides,
        },
      });
    },
  };
}
