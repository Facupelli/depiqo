import type { PrismaService } from 'src/core/database/prisma.service';
import { TenantAuthorizationRoleProvisioner } from 'src/modules/tenant-management/authorization/tenant-authorization-role.provisioner';
import { PasswordService } from 'src/modules/tenant-management/auth/shared/password/password.service';
import { TenantConfig } from 'src/modules/tenant-management/domain/value-objects/tenant-config.value-object';
import type { Prisma } from 'src/generated/prisma/client';
import { V2TenantSystemRole } from 'src/generated/prisma/enums';
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
type TenantUserOverrides = Partial<Omit<Prisma.V2TenantUserUncheckedCreateInput, 'tenantId' | 'roleId'>>;
type RentalCustomerOverrides = Partial<
  Omit<
    Prisma.V2RentalCustomerUncheckedCreateInput,
    'tenantId' | 'authIdentities' | 'profile' | 'tenant' | 'passwordHash'
  >
>;
type BranchOverrides = Partial<Omit<Prisma.V2BranchUncheckedCreateInput, 'tenantId' | 'schedules' | 'tenant'>>;

export type CreateTenantUserInput = {
  tenantId: string;
  password?: string;
  overrides?: TenantUserOverrides;
};

export type CreateTenantUserWithRoleInput = CreateTenantUserInput & {
  roleId: string;
};

export type CreateRentalCustomerInput = {
  tenantId: string;
  overrides?: RentalCustomerOverrides;
};

export type CreateRentalCustomerWithLocalCredentialInput = CreateRentalCustomerInput & {
  localCredential: {
    password?: string;
  };
};

export type RentalCustomerFixture = {
  customer: V2RentalCustomer;
};

export type RentalCustomerWithLocalCredentialFixture = RentalCustomerFixture & {
  password: string;
};

export type CreateBranchInput = {
  tenantId: string;
  overrides?: BranchOverrides;
};

export type TestFixtures = {
  createTenant(overrides?: TenantOverrides): Promise<V2Tenant>;
  createTenantUser(input: CreateTenantUserInput): Promise<TenantUserFixture>;
  createAdministratorTenantUser(input: CreateTenantUserInput): Promise<TenantUserFixture>;
  createTenantUserWithRole(input: CreateTenantUserWithRoleInput): Promise<TenantUserFixture>;
  createRentalCustomer(input: CreateRentalCustomerInput): Promise<RentalCustomerFixture>;
  createRentalCustomer(
    input: CreateRentalCustomerWithLocalCredentialInput,
  ): Promise<RentalCustomerWithLocalCredentialFixture>;
  createBranch(input: CreateBranchInput): Promise<V2Branch>;
};

export type TenantUserFixture = {
  user: V2TenantUser;
  credential: V2LocalCredential;
  password: string;
};

export function createTestFixtures(prisma: PrismaService, passwordService = new PasswordService()): TestFixtures {
  const authorizationRoleProvisioner = new TenantAuthorizationRoleProvisioner();
  async function createRentalCustomer(input: CreateRentalCustomerInput): Promise<RentalCustomerFixture>;
  async function createRentalCustomer(
    input: CreateRentalCustomerWithLocalCredentialInput,
  ): Promise<RentalCustomerWithLocalCredentialFixture>;
  async function createRentalCustomer(
    input: CreateRentalCustomerInput | CreateRentalCustomerWithLocalCredentialInput,
  ): Promise<RentalCustomerFixture | RentalCustomerWithLocalCredentialFixture> {
    const { tenantId, overrides = {} } = input;
    const localCredential = 'localCredential' in input ? input.localCredential : undefined;
    const password = localCredential?.password ?? 'test-password';
    const passwordData = localCredential ? await passwordService.hashPassword(password) : undefined;
    const unique = randomUUID();
    const customer = await prisma.client.v2RentalCustomer.create({
      data: {
        tenantId,
        email: `customer-${unique}@test.local`,
        firstName: 'Test',
        lastName: `Customer ${unique}`,
        passwordHash: passwordData?.hash ?? null,
        ...overrides,
      },
    });

    return passwordData ? { customer, password } : { customer };
  }

  async function createTenantUserWithRole({
    tenantId,
    roleId,
    password = 'test-password',
    overrides = {},
  }: CreateTenantUserWithRoleInput): Promise<TenantUserFixture> {
    const passwordData = await passwordService.hashPassword(password);

    return prisma.client.$transaction(async (tx) => {
      const roleExists = await tx.v2TenantRole.findUnique({
        where: { tenantId_id: { tenantId, id: roleId } },
        select: { id: true },
      });
      if (!roleExists) {
        throw new Error(`Cannot create a tenant user with role ${roleId} in tenant ${tenantId}.`);
      }

      const unique = randomUUID();
      const user = await tx.v2TenantUser.create({
        data: {
          tenantId,
          roleId,
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
  }

  return {
    createTenant: (overrides = {}) => {
      const unique = randomUUID();

      return prisma.client.$transaction(async (tx) => {
        // SAFETY: The fixture or preceding response assertions establish this object shape before these fields are inspected.
        const tenant = await tx.v2Tenant.create({
          data: {
            name: `Test tenant ${unique}`,
            slug: `test-tenant-${unique}`,
            config: TenantConfig.default().toPlainObject() as Prisma.InputJsonValue,
            ...overrides,
          },
        });
        await authorizationRoleProvisioner.provision(tx, tenant.id);
        return tenant;
      });
    },

    createTenantUser: async (input) => {
      const member = await prisma.client.v2TenantRole.findUnique({
        where: { tenantId_name: { tenantId: input.tenantId, name: 'Miembro' } },
        select: { id: true },
      });
      if (!member) {
        throw new Error(`Cannot create a Miembro tenant user for tenant ${input.tenantId}.`);
      }

      return createTenantUserWithRole({ ...input, roleId: member.id });
    },

    createAdministratorTenantUser: async (input) => {
      const administrator = await prisma.client.v2TenantRole.findUnique({
        where: { tenantId_systemRole: { tenantId: input.tenantId, systemRole: V2TenantSystemRole.ADMIN } },
        select: { id: true },
      });
      if (!administrator) {
        throw new Error(`Cannot create an Administrator tenant user for tenant ${input.tenantId}.`);
      }

      return createTenantUserWithRole({ ...input, roleId: administrator.id });
    },

    createTenantUserWithRole,

    createRentalCustomer,

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
