import { Test, TestingModule } from '@nestjs/testing';

import { AppConfigModule } from '../../../src/config/config.module';
import { PrismaService } from '../../../src/core/database/prisma.service';
import { V2AuthProvider } from '../../../src/generated/prisma/enums';
import { SharedModule } from '../../../src/modules/shared/shared.module';
import { createTestFixtures, TestFixtures } from '../../support/fixtures';

describe('rental customer authentication identity tenant integrity', () => {
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

  it('accepts an identity for a customer in the same tenant', async () => {
    const tenant = await fixtures.createTenant();
    const { customer } = await fixtures.createRentalCustomer({ tenantId: tenant.id });

    const identity = await prisma.client.v2RentalCustomerAuthIdentity.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        provider: V2AuthProvider.GOOGLE,
        providerAccountId: 'same-tenant-google-subject',
      },
    });

    expect(identity).toMatchObject({
      tenantId: tenant.id,
      customerId: customer.id,
      provider: V2AuthProvider.GOOGLE,
    });

    const otherTenant = await fixtures.createTenant();
    const { customer: otherCustomer } = await fixtures.createRentalCustomer({ tenantId: otherTenant.id });

    await expect(
      prisma.client.v2RentalCustomerAuthIdentity.create({
        data: {
          tenantId: otherTenant.id,
          customerId: otherCustomer.id,
          provider: V2AuthProvider.GOOGLE,
          providerAccountId: 'same-tenant-google-subject',
        },
      }),
    ).resolves.toMatchObject({ tenantId: otherTenant.id, customerId: otherCustomer.id });
  });

  it('does not cascade a customer tenant reassignment to its identities', async () => {
    const customerTenant = await fixtures.createTenant();
    const otherTenant = await fixtures.createTenant();
    const { customer } = await fixtures.createRentalCustomer({ tenantId: customerTenant.id });

    await prisma.client.v2RentalCustomerAuthIdentity.create({
      data: {
        tenantId: customerTenant.id,
        customerId: customer.id,
        provider: V2AuthProvider.GOOGLE,
        providerAccountId: 'reassignment-google-subject',
      },
    });

    await expect(
      prisma.client.v2RentalCustomer.update({
        where: { id: customer.id },
        data: { tenantId: otherTenant.id },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('rejects an identity whose tenant differs from its customer tenant', async () => {
    const customerTenant = await fixtures.createTenant();
    const identityTenant = await fixtures.createTenant();
    const { customer } = await fixtures.createRentalCustomer({ tenantId: customerTenant.id });

    await expect(
      prisma.client.v2RentalCustomerAuthIdentity.create({
        data: {
          tenantId: identityTenant.id,
          customerId: customer.id,
          provider: V2AuthProvider.GOOGLE,
          providerAccountId: 'cross-tenant-google-subject',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });
});
