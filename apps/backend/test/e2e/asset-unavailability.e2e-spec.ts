import { randomUUID } from 'node:crypto';

import {
  listAssetUnavailabilityContract,
  ListAssetUnavailabilityResponseSchema,
  ScheduleAssetUnavailabilityResponseSchema,
  TenantPermission,
} from '@repo/api-contracts';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../src/core/database/prisma.service';
import { createProblemType } from '../../src/core/problem-details';
import { RentalAssetAllocationService } from '../../src/modules/rental-commitment/asset-allocation/rental-asset-allocation.service';
import { ConfirmRentalFixtures } from '../../src/modules/rental-commitment/features/confirm-rental/testing/confirm-rental.fixtures';
import { ConfirmedRentalFixtures } from '../../src/modules/rental-commitment/testing/confirmed-rental.fixtures';
import { createE2ETestApp, E2ETestApp } from '../support/create-e2e-test-app';
import { createE2ETestClient } from '../support/create-e2e-test-client';
import { createTestFixtures } from '../support/fixtures';
import { expectProblemResponse, expectValidationProblem } from '../support/problem-response';

const rentalStartsAt = '2030-01-07T10:00:00.000Z';
const rentalEndsAt = '2030-01-07T12:00:00.000Z';
const bufferWindow = {
  startsAt: '2030-01-07T10:35:00+01:00',
  endsAt: '2030-01-07T10:55:00+01:00',
  reason: 'Inspection',
};
const adjacentWindow = { startsAt: '2030-01-07T09:00:00Z', endsAt: '2030-01-07T09:30:00Z', reason: 'Repair' };

function expectConflict(response: Parameters<typeof expectProblemResponse>[0], code: string) {
  expectProblemResponse(response, { status: 409, type: createProblemType(code), code });
}

describe('Asset unavailability HTTP API', () => {
  let app: E2ETestApp;
  let prisma: PrismaService;
  let fixtures: ReturnType<typeof createTestFixtures>;

  beforeAll(async () => {
    app = await createE2ETestApp();
    prisma = app.app.get(PrismaService);
    fixtures = createTestFixtures(prisma);
  });

  afterAll(async () => app?.close());

  async function scenario() {
    const tenant = await fixtures.createTenant();
    const branch = await fixtures.createBranch({ tenantId: tenant.id });
    await prisma.client.v2Branch.update({ where: { id: branch.id }, data: { rentalAssetBeforeBufferMinutes: 30 } });
    await prisma.client.v2BranchSchedule.createMany({
      data: [
        { branchId: branch.id, type: 'PICKUP', dayOfWeek: 1, openTime: 0, closeTime: 1439 },
        { branchId: branch.id, type: 'RETURN', dayOfWeek: 1, openTime: 0, closeTime: 1439 },
      ],
    });
    const { offer, equipmentType } = await new ConfirmedRentalFixtures(prisma).createOffer({
      tenantId: tenant.id,
      branchId: branch.id,
    });
    const assetId = await new ConfirmRentalFixtures(prisma).createCandidate({
      tenantId: tenant.id,
      branchId: branch.id,
      equipmentTypeId: equipmentType.id,
    });
    const admin = await fixtures.createAdministratorTenantUser({ tenantId: tenant.id });
    const staff = createE2ETestClient(app.app);
    await staff.loginTenantUser({ email: admin.user.email, password: admin.password });
    const path = listAssetUnavailabilityContract.path.replace(':assetId', assetId);
    const context = { tenantId: tenant.id, canonicalHost: `${tenant.slug}.localhost` };

    const schedule = (window: { startsAt?: string; endsAt: string; reason: string }) =>
      staff.withCsrf(staff.request().post(path)).send(window);

    return {
      tenant,
      assetId,
      offerId: offer.id,
      path,
      staff,
      schedule,
      scheduleSuccessfully: async (window: Parameters<typeof schedule>[0]) =>
        ScheduleAssetUnavailabilityResponseSchema.parse((await schedule(window).expect(201)).body).data.id,
      reschedule: (id: string, window: typeof bufferWindow) =>
        staff.withCsrf(staff.request().patch(`${path}/${id}`)).send(window),
      cancel: (id: string) => staff.withCsrf(staff.request().delete(`${path}/${id}`)),
      list: async () =>
        ListAssetUnavailabilityResponseSchema.parse((await staff.request().get(path).expect(200)).body).data,
      availability: async () => {
        const url = '/rental-commitment/rental-offers/availability';
        const client = createE2ETestClient(app.app);
        await client.getCsrfToken();
        const request = client.withCsrf(client.request().post(`/storefront${url}`));
        await client.withStorefrontTenantContext(request, context);
        const body = {
          branchId: branch.id,
          rentalOfferIds: [offer.id],
          periodStart: rentalStartsAt,
          periodEnd: rentalEndsAt,
        };
        return Promise.all([
          staff.withCsrf(staff.request().post(url)).send(body).expect(200),
          request.send(body).expect(200),
        ]);
      },
      confirm: async () => {
        const customer = await fixtures.createRentalCustomer({ tenantId: tenant.id, localCredential: {} });
        const client = createE2ETestClient(app.app);
        await client.loginTenantCustomer({ email: customer.customer.email, password: customer.password }, context);
        return client
          .withCsrf(client.request().post('/rental-commitments/confirmed-rentals'))
          .set('idempotency-key', randomUUID())
          .send({
            branchId: branch.id,
            period: { start: rentalStartsAt, end: rentalEndsAt },
            selectedOffers: [{ rentalOfferId: offer.id, quantity: 1 }],
            fulfillmentMethod: 'PICKUP',
          });
      },
    };
  }

  it('reschedules and cancels future periods, restoring storefront and backoffice capacity', async () => {
    const s = await scenario();
    const expectCapacity = async (availableCount: number) => {
      const [backoffice, storefront] = await s.availability();
      const counts = [{ rentalOfferId: s.offerId, availableCount }];
      expect(backoffice.body).toEqual({ data: counts });
      expect(storefront.body).toEqual({ data: { data: counts } });
    };
    const id = await s.scheduleSuccessfully(adjacentWindow);
    await expectCapacity(1);
    await s.reschedule(id, bufferWindow).expect(204);
    expect(await s.list()).toEqual([
      expect.objectContaining({ id, startsAt: '2030-01-07T09:35:00.000Z', reason: 'Inspection' }),
    ]);
    await expectCapacity(0);
    expectConflict(await s.confirm(), 'rental_commitment.insufficient_asset_availability');
    await s.cancel(id).expect(204);
    expect(await s.list()).toEqual([expect.objectContaining({ id, cancelledAt: expect.any(String) })]);
    await expectCapacity(1);
    expect((await s.confirm()).status).toBe(201);
  });

  it('rejects changes that overlap a confirmed operational reservation without changing the rental', async () => {
    const s = await scenario();
    expect((await s.confirm()).status).toBe(201);
    const readBlocks = () =>
      prisma.client
        .$queryRaw`SELECT id, rental_id, period::text, released_at FROM v2_asset_blocks WHERE tenant_id = ${s.tenant.id} AND rental_id IS NOT NULL`;
    const blocks = await readBlocks();
    expect(blocks).toHaveLength(1);
    expectConflict(await s.schedule(bufferWindow), 'asset_unavailability.overlap');
    const id = await s.scheduleSuccessfully(adjacentWindow);
    expectConflict(await s.reschedule(id, bufferWindow), 'asset_unavailability.overlap');
    const unavailability = await s.list();
    expect(unavailability).toEqual([expect.objectContaining({ id, reason: 'Repair' })]);
    expect(await readBlocks()).toEqual(blocks);
    expect(await prisma.client.v2AssignedAsset.count({ where: { tenantId: s.tenant.id, assetId: s.assetId } })).toBe(1);

    const rental = await prisma.client.v2Rental.findFirstOrThrow({ where: { tenantId: s.tenant.id } });
    await s.staff.withCsrf(s.staff.request().delete(`/rental-commitments/rentals/${rental.id}`)).expect(204);
    expect(await s.list()).toEqual(unavailability);
    await s.schedule(bufferWindow).expect(201);
  });

  it('cannot commit an allocation that raced with staff scheduling unavailability', async () => {
    const s = await scenario();
    const allocator = app.app.get(RentalAssetAllocationService);
    const plan = allocator.planAllocations.bind(allocator);
    const spy = vi.spyOn(allocator, 'planAllocations').mockImplementationOnce(async (input) => {
      const result = await plan(input);
      expect(result.isOk()).toBe(true);
      await s.schedule(bufferWindow).expect(201);
      return result;
    });
    try {
      expectConflict(await s.confirm(), 'rental_commitment.insufficient_asset_availability');
      expect(spy).toHaveBeenCalled();
      expect(await s.list()).toHaveLength(1);
      expect(await prisma.client.v2Rental.count({ where: { tenantId: s.tenant.id } })).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });

  it('ends an active period early without losing its elapsed time and makes it read-only', async () => {
    const s = await scenario();
    const id = await s.scheduleSuccessfully({ endsAt: rentalEndsAt, reason: 'Repair' });
    const [active] = await s.list();
    expectConflict(await s.reschedule(id, bufferWindow), 'asset_unavailability.not_editable');
    await s
      .reschedule(id, { startsAt: active.startsAt, endsAt: '2030-01-07T14:00:00Z', reason: active.reason })
      .expect(204);
    await s.cancel(id).expect(204);
    const [ended] = await s.list();
    expect(ended).toEqual({ ...active, endsAt: expect.any(String) });
    expect(Date.parse(ended.endsAt)).toBeGreaterThan(Date.parse(ended.startsAt));
    expect(Date.parse(ended.endsAt)).toBeLessThanOrEqual(Date.now());
    expectConflict(await s.reschedule(id, bufferWindow), 'asset_unavailability.not_editable');
    expectConflict(await s.cancel(id), 'asset_unavailability.not_editable');
  });

  it('validates offsets and ranges, checks write permissions, and hides other tenants’ assets and periods', async () => {
    const s = await scenario();
    const other = await scenario();
    const id = await s.scheduleSuccessfully(adjacentWindow);
    expectValidationProblem(await s.schedule({ ...bufferWindow, endsAt: '2030-01-07T09:55:00' }));
    expect((await s.schedule({ ...bufferWindow, endsAt: bufferWindow.startsAt })).status).toBe(422);
    await other.staff.request().get(s.path).expect(404);
    await other.staff.withCsrf(other.staff.request().post(s.path)).send(bufferWindow).expect(404);
    await other.staff.withCsrf(other.staff.request().delete(`${s.path}/${id}`)).expect(404);
    await other.reschedule(id, bufferWindow).expect(404);
    const role = await prisma.client.v2TenantRole.create({
      data: {
        tenantId: s.tenant.id,
        name: 'Inventory reader',
        permissions: { create: { permission: TenantPermission.InventoryRead } },
      },
    });
    const readerUser = await fixtures.createTenantUserWithRole({ tenantId: s.tenant.id, roleId: role.id });
    const reader = createE2ETestClient(app.app);
    await reader.loginTenantUser({ email: readerUser.user.email, password: readerUser.password });
    await reader.request().get(s.path).expect(200);
    await reader.withCsrf(reader.request().post(s.path)).send(bufferWindow).expect(403);
  });
});
