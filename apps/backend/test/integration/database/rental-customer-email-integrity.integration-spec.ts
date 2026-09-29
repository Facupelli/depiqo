import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { useIntegrationTestContext } from '../../support/integration-test-context';

import { AppConfigModule } from '../../../src/config/config.module';
import { PrismaService } from '../../../src/core/database/prisma.service';
import { SharedModule } from '../../../src/modules/shared/shared.module';
import { createTestFixtures, TestFixtures } from '../../support/fixtures';

describe('tenant-scoped customer email integrity', () => {
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

  it('rejects noncanonical email writes and duplicates in the current customer table', async () => {
    const tenant = await fixtures.createTenant();
    const email = `integrity-${randomUUID()}@example.test`;
    await fixtures.createRentalCustomer({ tenantId: tenant.id, overrides: { email } });

    await expect(
      fixtures.createRentalCustomer({ tenantId: tenant.id, overrides: { email: email.toUpperCase() } }),
    ).rejects.toThrow();
    await expect(fixtures.createRentalCustomer({ tenantId: tenant.id, overrides: { email } })).rejects.toThrow();

    const otherTenant = await fixtures.createTenant();
    await expect(
      fixtures.createRentalCustomer({ tenantId: otherTenant.id, overrides: { email } }),
    ).resolves.toBeDefined();
  });

  it('enforces the same rule for legacy customer records', async () => {
    const unique = randomUUID();
    const tenant = await prisma.client.tenant.create({
      data: { name: 'Email integrity test', slug: `email-integrity-${unique}`, config: {} },
    });
    const email = `legacy-integrity-${unique}@example.test`;
    const data = { tenantId: tenant.id, email, passwordHash: 'unused', firstName: 'Test', lastName: 'Customer' };
    await prisma.client.customer.create({ data });

    await expect(prisma.client.customer.create({ data: { ...data, email: email.toUpperCase() } })).rejects.toThrow();
    await expect(prisma.client.customer.create({ data })).rejects.toThrow();
  });
});
