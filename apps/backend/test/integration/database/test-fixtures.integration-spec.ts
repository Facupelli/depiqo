import { Test, TestingModule } from '@nestjs/testing';
import { useIntegrationTestContext } from '../../support/integration-test-context';

import { AppConfigModule } from '../../../src/config/config.module';
import { PrismaService } from '../../../src/core/database/prisma.service';
import { PasswordService } from '../../../src/modules/tenant-management/auth/shared/password/password.service';
import { V2PasswordAlgorithm, V2TenantSystemRole } from '../../../src/generated/prisma/enums';
import { SharedModule } from '../../../src/modules/shared/shared.module';
import { DEFAULT_MEMBER_TENANT_PERMISSIONS } from '../../../src/modules/tenant-management/authorization/tenant-permission.registry';
import { createTestFixtures, TestFixtures } from '../../support/fixtures';

describe('database test fixtures', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let fixtures: TestFixtures;

  useIntegrationTestContext(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, SharedModule],
      providers: [PrismaService],
    }).compile();
    await moduleRef.init();

    prisma = moduleRef.get(PrismaService);
    fixtures = createTestFixtures(prisma);
    return moduleRef;
  });

  it('generates unique defaults for entities with unique fields', async () => {
    const [firstTenant, secondTenant] = await Promise.all([fixtures.createTenant(), fixtures.createTenant()]);
    const [firstUser, secondUser] = await Promise.all([
      fixtures.createTenantUser({ tenantId: firstTenant.id }),
      fixtures.createTenantUser({ tenantId: secondTenant.id }),
    ]);
    const [firstCustomer, secondCustomer] = await Promise.all([
      fixtures.createRentalCustomer({ tenantId: firstTenant.id }),
      fixtures.createRentalCustomer({ tenantId: firstTenant.id }),
    ]);

    expect(firstTenant.slug).not.toBe(secondTenant.slug);
    expect(firstUser.user.email).not.toBe(secondUser.user.email);
    expect(firstCustomer.customer.email).not.toBe(secondCustomer.customer.email);
  });

  it('persists tenant-scoped fixtures for the explicitly supplied tenant', async () => {
    const tenant = await fixtures.createTenant();
    const [tenantUser, customer, branch] = await Promise.all([
      fixtures.createTenantUser({ tenantId: tenant.id }),
      fixtures.createRentalCustomer({ tenantId: tenant.id }),
      fixtures.createBranch({ tenantId: tenant.id }),
    ]);

    expect(tenantUser.user).toMatchObject({
      tenantId: tenant.id,
      roleId: expect.any(String),
    });
    expect(customer.customer).toMatchObject({ tenantId: tenant.id, passwordHash: null });
    expect(branch.tenantId).toBe(tenant.id);
  });

  it('provisions tenant roles and supports explicit custom-role user creation', async () => {
    const tenant = await fixtures.createTenant();
    const roles = await prisma.client.v2TenantRole.findMany({
      where: { tenantId: tenant.id },
      include: { permissions: true },
    });
    const administrator = roles.find(({ systemRole }) => systemRole === V2TenantSystemRole.ADMIN);
    const member = roles.find(({ name }) => name === 'Miembro');

    expect(roles).toHaveLength(2);
    expect(administrator?.permissions).toEqual([]);
    expect(member?.permissions.map(({ permission }) => permission).sort()).toEqual(
      [...DEFAULT_MEMBER_TENANT_PERMISSIONS].sort(),
    );

    const tenantUser = await fixtures.createTenantUser({ tenantId: tenant.id });
    const administratorUser = await fixtures.createAdministratorTenantUser({ tenantId: tenant.id });
    const explicitMemberUser = await fixtures.createTenantUserWithRole({ tenantId: tenant.id, roleId: member!.id });

    expect(tenantUser.user).toMatchObject({ roleId: member!.id });
    expect(administratorUser.user).toMatchObject({ roleId: administrator!.id });
    expect(explicitMemberUser.user).toMatchObject({ roleId: member!.id });
  });

  it('rejects a tenant user without an existing tenant', async () => {
    await expect(fixtures.createTenantUser({ tenantId: 'missing-tenant' })).rejects.toThrow(
      'Cannot create a Miembro tenant user for tenant missing-tenant.',
    );
  });

  it('creates credentials that production password verification accepts', async () => {
    const tenant = await fixtures.createTenant();
    const [tenantUser, customer] = await Promise.all([
      fixtures.createTenantUser({ tenantId: tenant.id, password: 'tenant-user-password' }),
      fixtures.createRentalCustomer({
        tenantId: tenant.id,
        localCredential: { password: 'rental-customer-password' },
      }),
    ]);
    const passwordService = new PasswordService();

    await expect(
      passwordService.verifyPassword({
        password: tenantUser.password,
        hash: tenantUser.credential.passwordHash,
        algorithm: tenantUser.credential.passwordAlgorithm,
      }),
    ).resolves.toBe(true);
    await expect(
      passwordService.verifyPassword({
        password: customer.password,
        hash: customer.customer.passwordHash!,
        algorithm: V2PasswordAlgorithm.ARGON2ID,
      }),
    ).resolves.toBe(true);
  });
});
