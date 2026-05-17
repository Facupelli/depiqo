import { randomUUID } from 'crypto';

import * as dotenv from 'dotenv';
import * as path from 'path';

import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ActorType, BookingMode, ScheduleSlotType, TrackingMode } from '@repo/types';
import request from 'supertest';

import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/core/database/prisma.service';
import { ProblemDetailsFilter } from 'src/core/exceptions/problem-detail.filter';
import { TransformInterceptor } from 'src/core/response/transform.interceptor';

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env.test') });

const tenantId = '20000000-0000-0000-0000-000000000001';
const otherTenantId = '20000000-0000-0000-0000-000000000002';
const locationId = '20000000-0000-0000-0000-000000000003';
const otherTenantLocationId = '20000000-0000-0000-0000-000000000004';
const billingUnitId = '20000000-0000-0000-0000-000000000005';
const activeProductId = '20000000-0000-0000-0000-000000000006';
const unpublishedProductId = '20000000-0000-0000-0000-000000000007';
const retiredBundleId = '20000000-0000-0000-0000-000000000008';
const activeAssetId = '20000000-0000-0000-0000-000000000009';
const authenticatedCustomerId = '20000000-0000-0000-0000-000000000010';
const spoofedCustomerId = '20000000-0000-0000-0000-000000000011';
const activeProductTierId = '20000000-0000-0000-0000-000000000012';
const retiredBundleComponentId = '20000000-0000-0000-0000-000000000013';

const pickupDate = '2026-04-02';
const returnDate = '2026-04-03';

describe('Customer booking guardrails HTTP integration', () => {
  let moduleRef: TestingModule;
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);
    jwtService = new JwtService({ secret: process.env.JWT_SECRET });

    app.useGlobalFilters(new ProblemDetailsFilter());
    app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));

    await app.init();
    await seedBaseData();
  });

  afterEach(async () => {
    await prisma.client.assetAssignment.deleteMany({
      where: { order: { tenantId } },
    });
    await prisma.client.orderItem.deleteMany({
      where: { order: { tenantId } },
    });
    await prisma.client.orderCreateIdempotencyKey.deleteMany({ where: { tenantId } });
    await prisma.client.order.deleteMany({ where: { tenantId } });
  });

  afterAll(async () => {
    await prisma.client.assetAssignment.deleteMany({
      where: { assetId: activeAssetId },
    });
    await prisma.client.orderItem.deleteMany({
      where: { order: { tenantId } },
    });
    await prisma.client.orderCreateIdempotencyKey.deleteMany({ where: { tenantId } });
    await prisma.client.order.deleteMany({ where: { tenantId } });
    await prisma.client.pricingTier.deleteMany({
      where: { id: { in: [activeProductTierId] } },
    });
    await prisma.client.bundleComponent.deleteMany({
      where: { id: retiredBundleComponentId },
    });
    await prisma.client.bundle.deleteMany({ where: { id: retiredBundleId } });
    await prisma.client.asset.deleteMany({ where: { id: activeAssetId } });
    await prisma.client.productType.deleteMany({
      where: { id: { in: [activeProductId, unpublishedProductId] } },
    });
    await prisma.client.locationSchedule.deleteMany({ where: { locationId } });
    await prisma.client.customer.deleteMany({
      where: { id: { in: [authenticatedCustomerId, spoofedCustomerId] } },
    });
    await prisma.client.location.deleteMany({
      where: { id: { in: [locationId, otherTenantLocationId] } },
    });
    await prisma.client.billingUnit.deleteMany({
      where: { id: billingUnitId },
    });
    await prisma.client.tenantOrderSequence.deleteMany({
      where: { tenantId: { in: [tenantId, otherTenantId] } },
    });
    await prisma.client.tenant.deleteMany({
      where: { id: { in: [tenantId, otherTenantId] } },
    });
    await app.close();
  });

  it('rejects cart preview for unpublished products', async () => {
    const response = await customerPreviewRequest(
      buildCartPreviewBody({
        items: [{ type: 'PRODUCT', productTypeId: unpublishedProductId, quantity: 1 }],
      }),
    ).expect(422);

    expect(response.body.type).toBe('errors://inactive-catalog-item');
    expect(response.body.title).toBe('Inactive Catalog Item');
  });

  it('rejects order creation for retired bundles', async () => {
    const response = await customerOrderRequest(
      buildOrderBody({
        items: [{ type: 'BUNDLE', bundleId: retiredBundleId }],
      }),
    ).expect(422);

    expect(response.body.type).toBe('errors://inactive-catalog-item');
    expect(response.body.title).toBe('Inactive Catalog Item');
  });

  it('forbids non-customer actors from customer booking endpoints', async () => {
    const orderResponse = await operatorOrderRequest(buildOrderBody()).expect(403);
    expect(orderResponse.body.detail).toBe('This endpoint is restricted to customers.');

    const previewResponse = await operatorPreviewRequest(buildCartPreviewBody()).expect(403);
    expect(previewResponse.body.detail).toBe('This endpoint is restricted to customers.');
  });

  it('ignores caller-supplied customer identity and binds the order to the authenticated customer', async () => {
    const response = await customerOrderRequest({
      ...buildOrderBody(),
      customerId: spoofedCustomerId,
    }).expect(201);

    const order = await prisma.client.order.findUniqueOrThrow({
      where: { id: response.body.data },
      select: { customerId: true },
    });

    expect(order.customerId).toBe(authenticatedCustomerId);
  });

  it('rejects invalid tenant location context for order creation', async () => {
    const response = await customerOrderRequest(buildOrderBody({ locationId: otherTenantLocationId })).expect(422);

    expect(response.body.type).toBe('errors://invalid-booking-context');
    expect(response.body.title).toBe('Invalid Booking Context');
  });

  it('rejects invalid tenant location context for cart preview', async () => {
    const response = await customerPreviewRequest(buildCartPreviewBody({ locationId: otherTenantLocationId })).expect(
      422,
    );

    expect(response.body.type).toBe('errors://invalid-booking-context');
    expect(response.body.title).toBe('Invalid Booking Context');
  });

  async function seedBaseData() {
    await prisma.client.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: {
        id: tenantId,
        name: 'Booking Guardrails Tenant',
        slug: `booking-guardrails-${tenantId}`,
        config: buildTenantConfig(BookingMode.INSTANT_BOOK),
      },
    });

    await prisma.client.tenant.upsert({
      where: { id: otherTenantId },
      update: {},
      create: {
        id: otherTenantId,
        name: 'Other Tenant',
        slug: `other-${otherTenantId}`,
        config: buildTenantConfig(BookingMode.INSTANT_BOOK),
      },
    });

    await prisma.client.billingUnit.upsert({
      where: { id: billingUnitId },
      update: {},
      create: {
        id: billingUnitId,
        label: 'day-guardrails',
        durationMinutes: 1440,
        sortOrder: 1,
      },
    });

    await prisma.client.location.upsert({
      where: { id: locationId },
      update: {},
      create: { id: locationId, tenantId, name: 'Main Location' },
    });

    await prisma.client.location.upsert({
      where: { id: otherTenantLocationId },
      update: {},
      create: {
        id: otherTenantLocationId,
        tenantId: otherTenantId,
        name: 'Foreign Location',
      },
    });

    await prisma.client.customer.upsert({
      where: { id: authenticatedCustomerId },
      update: {},
      create: {
        id: authenticatedCustomerId,
        tenantId,
        email: 'customer@example.com',
        passwordHash: 'hashed',
        firstName: 'Auth',
        lastName: 'Customer',
      },
    });

    await prisma.client.customer.upsert({
      where: { id: spoofedCustomerId },
      update: {},
      create: {
        id: spoofedCustomerId,
        tenantId,
        email: 'other@example.com',
        passwordHash: 'hashed',
        firstName: 'Other',
        lastName: 'Customer',
      },
    });

    await prisma.client.productType.upsert({
      where: { id: activeProductId },
      update: {},
      create: {
        id: activeProductId,
        tenantId,
        billingUnitId,
        name: 'Bookable Camera',
        trackingMode: TrackingMode.IDENTIFIED,
        attributes: {},
        publishedAt: new Date('2026-03-01T00:00:00.000Z'),
      },
    });

    await prisma.client.productType.upsert({
      where: { id: unpublishedProductId },
      update: {},
      create: {
        id: unpublishedProductId,
        tenantId,
        billingUnitId,
        name: 'Draft Camera',
        trackingMode: TrackingMode.IDENTIFIED,
        attributes: {},
      },
    });

    await prisma.client.bundle.upsert({
      where: { id: retiredBundleId },
      update: {},
      create: {
        id: retiredBundleId,
        tenantId,
        billingUnitId,
        name: 'Retired Bundle',
        publishedAt: new Date('2026-03-01T00:00:00.000Z'),
        retiredAt: new Date('2026-03-15T00:00:00.000Z'),
      },
    });

    await prisma.client.bundleComponent.upsert({
      where: { id: retiredBundleComponentId },
      update: {},
      create: {
        id: retiredBundleComponentId,
        bundleId: retiredBundleId,
        productTypeId: activeProductId,
        quantity: 1,
      },
    });

    await prisma.client.asset.upsert({
      where: { id: activeAssetId },
      update: {},
      create: {
        id: activeAssetId,
        locationId,
        productTypeId: activeProductId,
        isActive: true,
      },
    });

    await prisma.client.pricingTier.upsert({
      where: { id: activeProductTierId },
      update: {},
      create: {
        id: activeProductTierId,
        productTypeId: activeProductId,
        locationId,
        fromUnit: 1,
        toUnit: null,
        pricePerUnit: '100',
      },
    });

    await prisma.client.locationSchedule.createMany({
      data: [
        {
          locationId,
          type: ScheduleSlotType.PICKUP,
          dayOfWeek: new Date(`${pickupDate}T00:00:00.000Z`).getUTCDay(),
          openTime: 600,
          closeTime: 1020,
          slotIntervalMinutes: 60,
        },
        {
          locationId,
          type: ScheduleSlotType.RETURN,
          dayOfWeek: new Date(`${returnDate}T00:00:00.000Z`).getUTCDay(),
          openTime: 600,
          closeTime: 1020,
          slotIntervalMinutes: 60,
        },
      ],
      skipDuplicates: false,
    });
  }

  function buildTenantConfig(bookingMode: BookingMode) {
    return {
      pricing: {
        overRentalEnabled: false,
        maxOverRentThreshold: 0,
        weekendCountsAsOne: false,
        roundingRule: 'BILL_ANY_PARTIAL_DAY',
        defaultCurrency: 'USD',
      },
      timezone: 'UTC',
      newArrivalsWindowDays: 30,
      bookingMode,
    };
  }

  function buildOrderBody(overrides?: Record<string, unknown>) {
    return {
      locationId,
      pickupDate,
      returnDate,
      pickupTime: 600,
      returnTime: 900,
      items: [{ type: 'PRODUCT', productTypeId: activeProductId, quantity: 1 }],
      currency: 'USD',
      ...overrides,
    };
  }

  function buildCartPreviewBody(overrides?: Record<string, unknown>) {
    return {
      locationId,
      currency: 'USD',
      pickupDate,
      returnDate,
      items: [{ type: 'PRODUCT', productTypeId: activeProductId, quantity: 1 }],
      ...overrides,
    };
  }

  function customerOrderRequest(body: Record<string, unknown>, idempotencyKey = randomUUID()) {
    return request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${createToken(ActorType.CUSTOMER, authenticatedCustomerId)}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(body);
  }

  function operatorOrderRequest(body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${createToken(ActorType.USER, 'operator-user-id')}`)
      .set('Idempotency-Key', randomUUID())
      .send(body);
  }

  function customerPreviewRequest(body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post('/pricing/cart/preview')
      .set('Authorization', `Bearer ${createToken(ActorType.CUSTOMER, authenticatedCustomerId)}`)
      .send(body);
  }

  function operatorPreviewRequest(body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post('/pricing/cart/preview')
      .set('Authorization', `Bearer ${createToken(ActorType.USER, 'operator-user-id')}`)
      .send(body);
  }

  function createToken(actorType: ActorType, subject: string) {
    return jwtService.sign({
      sub: subject,
      email: actorType === ActorType.USER ? 'operator@example.com' : 'customer@example.com',
      tenantId,
      actorType,
    });
  }
});
