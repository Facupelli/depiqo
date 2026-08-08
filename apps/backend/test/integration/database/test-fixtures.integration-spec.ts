import { Test, TestingModule } from '@nestjs/testing';

import { AppConfigModule } from '../../../src/config/config.module';
import { PrismaService } from '../../../src/core/database/prisma.service';
import { PasswordService } from '../../../src/modules/tenant-management/auth/shared/password/password.service';
import { V2PasswordAlgorithm } from '../../../src/generated/prisma/enums';
import { SharedModule } from '../../../src/modules/shared/shared.module';
import { createTestFixtures, TestFixtures } from '../../support/fixtures';

describe('database test fixtures', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let fixtures: TestFixtures;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, SharedModule],
      providers: [PrismaService],
    }).compile();
    await moduleRef.init();

    prisma = moduleRef.get(PrismaService);
    fixtures = createTestFixtures(prisma);
  });

  afterEach(async () => {
    await moduleRef.close();
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

    expect(tenantUser.user.tenantId).toBe(tenant.id);
    expect(customer.customer.tenantId).toBe(tenant.id);
    expect(branch.tenantId).toBe(tenant.id);
  });

  it('rejects a tenant user without an existing tenant', async () => {
    await expect(fixtures.createTenantUser({ tenantId: 'missing-tenant' })).rejects.toThrow(
      'Cannot create a tenant user for nonexistent tenant missing-tenant.',
    );
  });

  it('creates credentials that production password verification accepts', async () => {
    const tenant = await fixtures.createTenant();
    const [tenantUser, customer] = await Promise.all([
      fixtures.createTenantUser({ tenantId: tenant.id, password: 'tenant-user-password' }),
      fixtures.createRentalCustomer({ tenantId: tenant.id, password: 'rental-customer-password' }),
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
