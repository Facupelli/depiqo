import * as dotenv from 'dotenv';
import * as path from 'path';
import { randomUUID } from 'crypto';

import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ActorType, OrderItemType, OrderStatus, Permission, RentalItemKind, TrackingMode } from '@repo/types';
import request from 'supertest';

import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/core/database/prisma.service';
import { ProblemDetailsFilter } from 'src/core/exceptions/problem-detail.filter';
import { TransformInterceptor } from 'src/core/response/transform.interceptor';

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env.test') });

const tenantId = '20000000-0000-0000-0000-000000000001';
const locationId = '20000000-0000-0000-0000-000000000002';
const billingUnitId = '20000000-0000-0000-0000-000000000003';
const primaryProductTypeId = '20000000-0000-0000-0000-000000000004';
const accessoryProductTypeId = '20000000-0000-0000-0000-000000000005';
const accessoryAssetId = '20000000-0000-0000-0000-000000000006';
const adminRoleId = '20000000-0000-0000-0000-000000000007';
const operatorUserId = '20000000-0000-0000-0000-000000000008';
const accessoryLinkId = '20000000-0000-0000-0000-000000000009';

type CreatedOrder = {
  orderId: string;
  orderItemId: string;
};

describe('Order accessory preparation HTTP integration', () => {
  let moduleRef: TestingModule;
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const createdOrders: CreatedOrder[] = [];

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
    const orderIds = createdOrders.map((entry) => entry.orderId);
    const orderItemIds = createdOrders.map((entry) => entry.orderItemId);

    if (orderIds.length > 0) {
      await prisma.client.assetAssignment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.client.orderItemAccessory.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.client.orderItem.deleteMany({ where: { id: { in: orderItemIds } } });
      await prisma.client.order.deleteMany({ where: { id: { in: orderIds } } });
      createdOrders.splice(0, createdOrders.length);
    }
  });

  afterAll(async () => {
    await prisma.client.assetAssignment.deleteMany({ where: { assetId: accessoryAssetId } });
    await prisma.client.accessoryLink.deleteMany({ where: { id: accessoryLinkId } });
    await prisma.client.asset.deleteMany({ where: { id: accessoryAssetId } });
    await prisma.client.productType.deleteMany({ where: { id: { in: [primaryProductTypeId, accessoryProductTypeId] } } });
    await prisma.client.location.deleteMany({ where: { id: locationId } });
    await prisma.client.userRole.deleteMany({ where: { userId: operatorUserId } });
    await prisma.client.rolePermission.deleteMany({ where: { roleId: adminRoleId } });
    await prisma.client.user.deleteMany({ where: { id: operatorUserId } });
    await prisma.client.role.deleteMany({ where: { id: adminRoleId } });
    await prisma.client.billingUnit.deleteMany({ where: { id: billingUnitId } });
    await prisma.client.tenantOrderSequence.deleteMany({ where: { tenantId } });
    await prisma.client.tenant.deleteMany({ where: { id: tenantId } });
    await app.close();
  });

  it('saves accessory selections for pending-review orders without creating inventory assignments', async () => {
    const { orderId, orderItemId } = await createPendingReviewOrderFixture();

    await staffRequest(`/orders/${orderId}/accessory-preparation`)
      .put()
      .send({
        items: [
          {
            orderItemId,
            accessories: [
              {
                accessoryRentalItemId: accessoryProductTypeId,
                quantity: 1,
                notes: 'Include one extra battery',
              },
            ],
          },
        ],
      })
      .expect(204);

    const accessory = await prisma.client.orderItemAccessory.findFirstOrThrow({
      where: { orderId, orderItemId, accessoryRentalItemId: accessoryProductTypeId },
      select: { quantity: true, notes: true },
    });
    const assignments = await prisma.client.assetAssignment.findMany({
      where: { orderId, orderItemAccessoryId: { not: null } },
      select: { id: true },
    });

    expect(accessory.quantity).toBe(1);
    expect(accessory.notes).toBe('Include one extra battery');
    expect(assignments).toHaveLength(0);
  });

  it('rejects concrete accessory asset assignment while the order is pending review', async () => {
    const { orderId, orderItemId } = await createPendingReviewOrderFixture();
    const orderItemAccessory = await prisma.client.orderItemAccessory.create({
      data: {
        tenantId,
        orderId,
        orderItemId,
        accessoryRentalItemId: accessoryProductTypeId,
        quantity: 1,
      },
      select: { id: true },
    });

    const response = await staffRequest(
      `/orders/${orderId}/items/${orderItemId}/accessories/${orderItemAccessory.id}/assets`,
    )
      .put()
      .send({ assetIds: [accessoryAssetId] })
      .expect(422);

    expect(response.body.type).toBe('errors://http-error');
    expect(response.body.detail).toBe(
      `Cannot assign concrete accessory assets while an order is in '${OrderStatus.PENDING_REVIEW}' status.`,
    );

    const assignments = await prisma.client.assetAssignment.findMany({
      where: { orderId, orderItemAccessoryId: orderItemAccessory.id },
      select: { id: true },
    });

    expect(assignments).toHaveLength(0);
  });

  async function seedBaseData() {
    await prisma.client.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: { id: tenantId, name: 'Accessory Tenant', slug: `accessory-${tenantId}`, config: {} },
    });

    await prisma.client.role.upsert({
      where: { id: adminRoleId },
      update: { tenantId, code: 'TENANT_ADMIN', name: 'Admin' },
      create: { id: adminRoleId, tenantId, code: 'TENANT_ADMIN', name: 'Admin' },
    });

    await prisma.client.rolePermission.createMany({
      data: [{ roleId: adminRoleId, permission: Permission.CREATE_ORDERS }],
      skipDuplicates: true,
    });

    await prisma.client.user.upsert({
      where: { id: operatorUserId },
      update: {},
      create: {
        id: operatorUserId,
        tenantId,
        email: 'accessory-operator@example.com',
        passwordHash: 'hashed',
        firstName: 'Accessory',
        lastName: 'Operator',
      },
    });

    await prisma.client.userRole.createMany({
      data: [{ userId: operatorUserId, roleId: adminRoleId }],
      skipDuplicates: true,
    });

    await prisma.client.billingUnit.upsert({
      where: { id: billingUnitId },
      update: {},
      create: { id: billingUnitId, label: `day-${billingUnitId}`, durationMinutes: 1440, sortOrder: 1 },
    });

    await prisma.client.location.upsert({
      where: { id: locationId },
      update: {},
      create: { id: locationId, tenantId, name: 'Accessory Location' },
    });

    await prisma.client.productType.upsert({
      where: { id: primaryProductTypeId },
      update: {},
      create: {
        id: primaryProductTypeId,
        tenantId,
        billingUnitId,
        name: 'Accessory Camera',
        trackingMode: TrackingMode.IDENTIFIED,
        attributes: {},
      },
    });

    await prisma.client.productType.upsert({
      where: { id: accessoryProductTypeId },
      update: {},
      create: {
        id: accessoryProductTypeId,
        tenantId,
        billingUnitId,
        name: 'Accessory Battery',
        trackingMode: TrackingMode.IDENTIFIED,
        kind: RentalItemKind.ACCESSORY,
        attributes: {},
      },
    });

    await prisma.client.asset.upsert({
      where: { id: accessoryAssetId },
      update: {},
      create: { id: accessoryAssetId, locationId, productTypeId: accessoryProductTypeId, isActive: true },
    });

    await prisma.client.accessoryLink.upsert({
      where: { id: accessoryLinkId },
      update: {
        tenantId,
        primaryRentalItemId: primaryProductTypeId,
        accessoryRentalItemId: accessoryProductTypeId,
        isDefaultIncluded: false,
        defaultQuantity: 1,
        notes: null,
      },
      create: {
        id: accessoryLinkId,
        tenantId,
        primaryRentalItemId: primaryProductTypeId,
        accessoryRentalItemId: accessoryProductTypeId,
        isDefaultIncluded: false,
        defaultQuantity: 1,
        notes: null,
      },
    });
  }

  async function createPendingReviewOrderFixture(): Promise<CreatedOrder> {
    const orderId = randomUUID();
    const orderItemId = randomUUID();

    createdOrders.push({ orderId, orderItemId });

    await prisma.client.order.create({
      data: {
        id: orderId,
        tenantId,
        locationId,
        status: OrderStatus.PENDING_REVIEW,
        orderNumber: 910000 + createdOrders.length,
        periodStart: new Date('2026-04-02T10:00:00.000Z'),
        periodEnd: new Date('2026-04-03T10:00:00.000Z'),
      },
    });

    await prisma.client.orderItem.create({
      data: {
        id: orderItemId,
        orderId,
        type: OrderItemType.PRODUCT,
        productTypeId: primaryProductTypeId,
        priceSnapshot: {
          currency: 'ARS',
          basePrice: '0',
          finalPrice: '0',
          totalUnits: 1,
          pricePerBillingUnit: '0',
          discounts: [],
        },
      },
    });

    return { orderId, orderItemId };
  }

  function staffRequest(url: string) {
    return {
      put: () =>
        request(app.getHttpServer())
          .put(url)
          .set('Authorization', `Bearer ${createToken(ActorType.USER, operatorUserId)}`),
    };
  }

  function createToken(actorType: ActorType, subject: string): string {
    return jwtService.sign({
      sub: subject,
      email: actorType === ActorType.USER ? 'operator@example.com' : 'customer@example.com',
      tenantId,
      actorType,
    });
  }
});
