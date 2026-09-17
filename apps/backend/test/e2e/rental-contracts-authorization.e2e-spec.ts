import { randomUUID } from 'node:crypto';

import { TenantPermission, type TenantPermission as TenantPermissionId } from '@repo/api-contracts';

import { PrismaService } from '../../src/core/database/prisma.service';
import type { E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient, type E2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures, type TestFixtures } from '../support/fixtures';

describe('Rental Commitment and Contracts HTTP authorization', () => {
  let app: E2ETestApp;
  let prisma: PrismaService;
  let fixtures: TestFixtures;

  beforeAll(async () => {
    const { createE2ETestApp } = await import('../support/create-e2e-test-app');
    app = await createE2ETestApp();
    prisma = app.app.get(PrismaService);
    fixtures = createTestFixtures(prisma);
  });

  afterAll(async () => app?.close());

  async function clientWithPermissions(
    tenantId: string,
    permissions: readonly TenantPermissionId[],
  ): Promise<E2ETestClient> {
    const unique = randomUUID();
    const role = await prisma.client.v2TenantRole.create({
      data: {
        tenantId,
        name: `Restricted role ${unique}`,
        permissions: { create: permissions.map((permission) => ({ permission })) },
      },
    });
    const tenantUser = await fixtures.createTenantUserWithRole({ tenantId, roleId: role.id });
    const client = createE2ETestClient(app.app);
    await client.loginTenantUser({ email: tenantUser.user.email, password: tenantUser.password });
    return client;
  }

  async function clientsFor(permission: TenantPermissionId) {
    const tenant = await fixtures.createTenant();
    return {
      allowed: await clientWithPermissions(tenant.id, [permission]),
      denied: await clientWithPermissions(tenant.id, []),
    };
  }

  it('enforces rentals.read on rental reads', async () => {
    const { allowed, denied } = await clientsFor(TenantPermission.RentalsRead);

    await allowed.request().get('/rental-commitments/rentals').expect(200);
    await denied.request().get('/rental-commitments/rentals').expect(403);
  });

  it('enforces rentals.proposals.manage on ordinary proposal management', async () => {
    const { allowed, denied } = await clientsFor(TenantPermission.RentalsProposalsManage);
    const path = `/rental-commitments/rentals/${randomUUID()}/customer`;
    const body = { customerId: randomUUID() };

    await allowed.withCsrf(allowed.request().put(path)).send(body).expect(404);
    await denied.withCsrf(denied.request().put(path)).send(body).expect(403);
  });

  it('conditionally protects manual pricing on draft rental creation', async () => {
    const tenant = await fixtures.createTenant();
    const proposalOnly = await clientWithPermissions(tenant.id, [TenantPermission.RentalsProposalsManage]);
    const priceOnly = await clientWithPermissions(tenant.id, [TenantPermission.RentalsPriceAdjustmentManage]);
    const fullyAllowed = await clientWithPermissions(tenant.id, [
      TenantPermission.RentalsProposalsManage,
      TenantPermission.RentalsPriceAdjustmentManage,
    ]);
    const ordinaryBody = {
      branchId: randomUUID(),
      period: { start: '2027-01-10T10:00:00-03:00', end: '2027-01-11T10:00:00-03:00' },
      selectedOffers: [],
      fulfillmentMethod: 'PICKUP',
    };
    const path = '/rental-commitments/draft-rentals';

    await proposalOnly.withCsrf(proposalOnly.request().post(path)).send(ordinaryBody).expect(422);
    await proposalOnly
      .withCsrf(proposalOnly.request().post(path))
      .send({ ...ordinaryBody, manualPricingAdjustment: { mode: 'TARGET_TOTAL', targetTotal: '100' } })
      .expect(403);
    await fullyAllowed
      .withCsrf(fullyAllowed.request().post(path))
      .send({ ...ordinaryBody, manualPricingAdjustment: { mode: 'TARGET_TOTAL', targetTotal: '100' } })
      .expect(422);
    await priceOnly.withCsrf(priceOnly.request().post(path)).send(ordinaryBody).expect(403);
  });

  it('conditionally protects manual pricing on draft rental updates', async () => {
    const tenant = await fixtures.createTenant();
    const proposalOnly = await clientWithPermissions(tenant.id, [TenantPermission.RentalsProposalsManage]);
    const priceOnly = await clientWithPermissions(tenant.id, [TenantPermission.RentalsPriceAdjustmentManage]);
    const fullyAllowed = await clientWithPermissions(tenant.id, [
      TenantPermission.RentalsProposalsManage,
      TenantPermission.RentalsPriceAdjustmentManage,
    ]);
    const path = `/rental-commitments/draft-rentals/${randomUUID()}`;
    const ordinaryBody = {
      expectedVersion: 0,
      branchId: randomUUID(),
      period: { start: '2027-01-10T10:00:00-03:00', end: '2027-01-11T10:00:00-03:00' },
      selectedOffers: [],
      fulfillmentMethod: 'PICKUP',
    };

    await proposalOnly.withCsrf(proposalOnly.request().put(path)).send(ordinaryBody).expect(404);
    await proposalOnly
      .withCsrf(proposalOnly.request().put(path))
      .send({ ...ordinaryBody, manualPricingAdjustment: { mode: 'TARGET_TOTAL', targetTotal: '100' } })
      .expect(403);
    await fullyAllowed
      .withCsrf(fullyAllowed.request().put(path))
      .send({ ...ordinaryBody, manualPricingAdjustment: { mode: 'TARGET_TOTAL', targetTotal: '100' } })
      .expect(404);
    await priceOnly.withCsrf(priceOnly.request().put(path)).send(ordinaryBody).expect(403);
  });

  it('conditionally protects changes and explicit clearing of confirmed rental manual pricing', async () => {
    const tenant = await fixtures.createTenant();
    const confirmedOnly = await clientWithPermissions(tenant.id, [TenantPermission.RentalsConfirmedManage]);
    const priceOnly = await clientWithPermissions(tenant.id, [TenantPermission.RentalsPriceAdjustmentManage]);
    const fullyAllowed = await clientWithPermissions(tenant.id, [
      TenantPermission.RentalsConfirmedManage,
      TenantPermission.RentalsPriceAdjustmentManage,
    ]);
    const path = `/rental-commitments/confirmed-rentals/${randomUUID()}/details`;

    await confirmedOnly
      .withCsrf(confirmedOnly.request().patch(path))
      .send({ expectedVersion: 0, notes: 'Ordinary edit' })
      .expect(404);
    await confirmedOnly
      .withCsrf(confirmedOnly.request().patch(path))
      .send({ expectedVersion: 0, manualPricingAdjustment: { mode: 'TARGET_TOTAL', targetTotal: '100' } })
      .expect(403);
    await fullyAllowed
      .withCsrf(fullyAllowed.request().patch(path))
      .send({ expectedVersion: 0, manualPricingAdjustment: { mode: 'TARGET_TOTAL', targetTotal: '100' } })
      .expect(404);
    await confirmedOnly
      .withCsrf(confirmedOnly.request().patch(path))
      .send({ expectedVersion: 0, manualPricingAdjustment: null })
      .expect(403);
    await fullyAllowed
      .withCsrf(fullyAllowed.request().patch(path))
      .send({ expectedVersion: 0, manualPricingAdjustment: null })
      .expect(404);
    await priceOnly
      .withCsrf(priceOnly.request().patch(path))
      .send({ expectedVersion: 0, notes: 'No base permission' })
      .expect(403);
  });

  it('enforces rentals.confirm independently from proposal management', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.RentalsConfirm]);
    const proposalOnly = await clientWithPermissions(tenant.id, [TenantPermission.RentalsProposalsManage]);
    const path = `/rental-commitments/rentals/${randomUUID()}/confirm`;

    await allowed.withCsrf(allowed.request().post(path)).expect(404);
    await proposalOnly.withCsrf(proposalOnly.request().post(path)).expect(403);
  });

  it('enforces rentals.confirmed.manage on confirmed-rental changes', async () => {
    const { allowed, denied } = await clientsFor(TenantPermission.RentalsConfirmedManage);
    const path = `/rental-commitments/confirmed-rentals/${randomUUID()}/period`;
    const body = {
      expectedVersion: 0,
      period: { start: '2027-01-10T10:00:00-03:00', end: '2027-01-11T10:00:00-03:00' },
    };

    await allowed.withCsrf(allowed.request().patch(path)).send(body).expect(404);
    await denied.withCsrf(denied.request().patch(path)).send(body).expect(403);
  });

  it('enforces rentals.fulfillment.manage independently from confirmed management', async () => {
    const tenant = await fixtures.createTenant();
    const allowed = await clientWithPermissions(tenant.id, [TenantPermission.RentalsFulfillmentManage]);
    const confirmedOnly = await clientWithPermissions(tenant.id, [TenantPermission.RentalsConfirmedManage]);
    const path = `/rental-commitments/confirmed-rentals/${randomUUID()}/assigned-assets/${randomUUID()}/replacement-candidates`;

    await allowed.request().get(path).expect(404);
    await confirmedOnly.request().get(path).expect(403);
  });

  it('enforces rentals.cancel independently', async () => {
    const { allowed, denied } = await clientsFor(TenantPermission.RentalsCancel);
    const path = `/rental-commitments/rentals/${randomUUID()}`;

    await allowed.withCsrf(allowed.request().delete(path)).expect(404);
    await denied.withCsrf(denied.request().delete(path)).expect(403);
  });

  it('enforces contracts.read independently', async () => {
    const { allowed, denied } = await clientsFor(TenantPermission.ContractsRead);
    const path = `/contracts/rentals/${randomUUID()}/signing-summary`;

    await allowed.request().get(path).expect(200);
    await denied.request().get(path).expect(403);
  });

  it('enforces contracts.generate independently', async () => {
    const { allowed, denied } = await clientsFor(TenantPermission.ContractsGenerate);
    const path = `/contracts/rentals/${randomUUID()}/budget`;

    await allowed.withCsrf(allowed.request().post(path)).send({}).expect(404);
    await denied.withCsrf(denied.request().post(path)).send({}).expect(403);
  });

  it('enforces contracts.signing.send independently', async () => {
    const { allowed, denied } = await clientsFor(TenantPermission.ContractsSigningSend);
    const path = `/document-signing/orders/${randomUUID()}/sessions`;
    const body = { recipientEmail: 'signer@test.local' };

    await allowed.withCsrf(allowed.request().post(path)).send(body).expect(422);
    await denied.withCsrf(denied.request().post(path)).send(body).expect(403);
  });
});
