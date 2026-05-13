import * as dotenv from 'dotenv';
import * as path from 'path';
import { randomUUID } from 'crypto';

import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  ActorType,
  AssignmentSource,
  AssignmentType,
  ContractBasis,
  OrderAssignmentStage,
  OrderItemType,
  OrderStatus,
  Permission,
  PromotionType,
  RentalItemKind,
  TrackingMode,
} from '@repo/types';
import request from 'supertest';
import { SplitStatus } from '../../domain/entities/order-item-owner-split.entity';

import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/core/database/prisma.service';
import { ProblemDetailsFilter } from 'src/core/exceptions/problem-detail.filter';
import { TransformInterceptor } from 'src/core/response/transform.interceptor';

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env.test') });

const tenantId = '10000000-0000-0000-0000-000000000001';
const locationId = '10000000-0000-0000-0000-000000000002';
const productTypeId = '10000000-0000-0000-0000-000000000003';
const billingUnitId = '10000000-0000-0000-0000-000000000004';
const assetId = '10000000-0000-0000-0000-000000000005';
const adminRoleId = '10000000-0000-0000-0000-000000000006';
const limitedRoleId = '10000000-0000-0000-0000-000000000007';
const operatorUserId = '10000000-0000-0000-0000-000000000008';
const limitedOperatorUserId = '10000000-0000-0000-0000-000000000009';
const ownerId = '10000000-0000-0000-0000-000000000010';
const ownerContractId = '10000000-0000-0000-0000-000000000011';
const promotionId = '10000000-0000-0000-0000-000000000012';
const couponId = '10000000-0000-0000-0000-000000000013';
const accessoryProductTypeId = '10000000-0000-0000-0000-000000000014';
const accessoryAssetId = '10000000-0000-0000-0000-000000000015';
const accessoryLinkId = '10000000-0000-0000-0000-000000000016';

const TEST_PERIOD = {
  start: new Date('2026-04-02T10:00:00.000Z'),
  end: new Date('2026-04-03T10:00:00.000Z'),
};

type CreatedOrder = {
  orderId: string;
  orderItemId: string;
};

describe('Order lifecycle HTTP integration', () => {
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
      await prisma.client.couponRedemption.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.client.orderItemAccessory.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.client.orderItemOwnerSplit.deleteMany({ where: { orderItemId: { in: orderItemIds } } });
      await prisma.client.orderItem.deleteMany({ where: { id: { in: orderItemIds } } });
      await prisma.client.order.deleteMany({ where: { id: { in: orderIds } } });
      createdOrders.splice(0, createdOrders.length);
    }
  });

  afterAll(async () => {
    await prisma.client.assetAssignment.deleteMany({ where: { assetId: { in: [assetId, accessoryAssetId] } } });
    await prisma.client.ownerContract.deleteMany({ where: { id: ownerContractId } });
    await prisma.client.accessoryLink.deleteMany({ where: { id: accessoryLinkId } });
    await prisma.client.asset.deleteMany({ where: { id: { in: [assetId, accessoryAssetId] } } });
    await prisma.client.owner.deleteMany({ where: { id: ownerId } });
    await prisma.client.coupon.deleteMany({ where: { id: couponId } });
    await prisma.client.promotion.deleteMany({ where: { id: promotionId } });
    await prisma.client.productType.deleteMany({ where: { id: { in: [productTypeId, accessoryProductTypeId] } } });
    await prisma.client.location.deleteMany({ where: { id: locationId } });
    await prisma.client.userRole.deleteMany({ where: { userId: { in: [operatorUserId, limitedOperatorUserId] } } });
    await prisma.client.rolePermission.deleteMany({ where: { roleId: { in: [adminRoleId, limitedRoleId] } } });
    await prisma.client.user.deleteMany({ where: { id: { in: [operatorUserId, limitedOperatorUserId] } } });
    await prisma.client.role.deleteMany({ where: { id: { in: [adminRoleId, limitedRoleId] } } });
    await prisma.client.billingUnit.deleteMany({ where: { id: billingUnitId } });
    await prisma.client.tenantOrderSequence.deleteMany({ where: { tenantId } });
    await prisma.client.tenant.deleteMany({ where: { id: tenantId } });
    await app.close();
  });

  describe('happy path transitions', () => {
    it('confirms a pending-review order by creating COMMITTED assignments and review metadata', async () => {
      const { orderId, orderItemId } = await createOrderFixture(OrderStatus.PENDING_REVIEW, null);

      await operatorRequest(`/orders/${orderId}/confirm`).expect(204);

      await expectOrderStatus(orderId, OrderStatus.CONFIRMED);
      await expectAssignmentStages(orderId, [OrderAssignmentStage.COMMITTED]);
      await expectOwnerSplitStatuses(orderItemId, [SplitStatus.PENDING]);
      await expectOrderReview(orderId, operatorUserId);
    });

    it('rejects a pending-review order with review metadata and no inventory side effects', async () => {
      const { orderId } = await createOrderFixture(OrderStatus.PENDING_REVIEW, null);

      await operatorRequest(`/orders/${orderId}/reject`).send({ rejectionReason: 'Unavailable after review' }).expect(204);

      await expectOrderStatus(orderId, OrderStatus.REJECTED);
      await expectAssignmentStages(orderId, []);
      await expectOrderReview(orderId, operatorUserId, 'Unavailable after review');
    });

    it('confirms a pending-review order with accessories by creating committed accessory assignments', async () => {
      const { orderId } = await createOrderFixture(OrderStatus.PENDING_REVIEW, null, {
        accessories: [{ accessoryRentalItemId: accessoryProductTypeId, quantity: 1 }],
      });

      await operatorRequest(`/orders/${orderId}/confirm`).expect(204);

      await expectOrderStatus(orderId, OrderStatus.CONFIRMED);
      await expectAssignmentStages(orderId, [OrderAssignmentStage.COMMITTED, OrderAssignmentStage.COMMITTED]);
      await expectAccessoryAssignmentCount(orderId, 1);
    });

    it('cancels a confirmed order, releases COMMITTED assignments, voids owner splits, and voids coupon redemption', async () => {
      const { orderId, orderItemId } = await createOrderFixture(OrderStatus.CONFIRMED, OrderAssignmentStage.COMMITTED, {
        couponApplied: true,
        ownerSplitStatus: SplitStatus.PENDING,
      });

      await operatorRequest(`/orders/${orderId}/cancel`).expect(204);

      await expectOrderStatus(orderId, OrderStatus.CANCELLED);
      await expectAssignmentStages(orderId, []);
      await expectOwnerSplitStatuses(orderItemId, [SplitStatus.VOID]);
      await expectCouponRedemptionVoided(orderId, true);
    });

    it('marks equipment as retired by activating a confirmed order without mutating assignments', async () => {
      const { orderId } = await createOrderFixture(OrderStatus.CONFIRMED, OrderAssignmentStage.COMMITTED);

      await operatorRequest(`/orders/${orderId}/mark-equipment-retired`).expect(204);

      await expectOrderStatus(orderId, OrderStatus.ACTIVE);
      await expectAssignmentStages(orderId, [OrderAssignmentStage.COMMITTED]);
    });

    it('marks equipment as returned by completing an active order and preserves assignment history', async () => {
      const { orderId } = await createOrderFixture(OrderStatus.ACTIVE, OrderAssignmentStage.COMMITTED);

      await operatorRequest(`/orders/${orderId}/mark-equipment-returned`).expect(204);

      await expectOrderStatus(orderId, OrderStatus.COMPLETED);
      await expectAssignmentStages(orderId, [OrderAssignmentStage.COMMITTED]);
    });
  });

  describe('authorization', () => {
    it.each([
      ['confirm', OrderStatus.PENDING_REVIEW, OrderAssignmentStage.HOLD],
      ['reject', OrderStatus.PENDING_REVIEW, OrderAssignmentStage.HOLD],
      ['cancel', OrderStatus.CONFIRMED, OrderAssignmentStage.COMMITTED],
      ['mark-equipment-retired', OrderStatus.CONFIRMED, OrderAssignmentStage.COMMITTED],
      ['mark-equipment-returned', OrderStatus.ACTIVE, OrderAssignmentStage.COMMITTED],
    ])('forbids customer access to %s endpoint', async (action, status, stage) => {
      const { orderId } = await createOrderFixture(status, stage);

      const response = await customerRequest(`/orders/${orderId}/${action}`).expect(403);

      expect(response.body.type).toBe('errors://http-error');
      expect(response.body.detail).toBe('This endpoint is restricted to staff users.');
    });

    it.each([
      ['confirm', OrderStatus.PENDING_REVIEW, OrderAssignmentStage.HOLD],
      ['reject', OrderStatus.PENDING_REVIEW, OrderAssignmentStage.HOLD],
      ['cancel', OrderStatus.CONFIRMED, OrderAssignmentStage.COMMITTED],
      ['mark-equipment-retired', OrderStatus.CONFIRMED, OrderAssignmentStage.COMMITTED],
      ['mark-equipment-returned', OrderStatus.ACTIVE, OrderAssignmentStage.COMMITTED],
    ])('forbids operators without permission from %s endpoint', async (action, status, stage) => {
      const { orderId } = await createOrderFixture(status, stage);

      const response = await unauthorizedOperatorRequest(`/orders/${orderId}/${action}`).expect(403);

      expect(response.body.type).toBe('errors://http-error');
      expect(response.body.detail).toBe('You do not have permission to access this resource.');
    });
  });

  describe('error handling', () => {
    it.each([
      ['confirm', OrderStatus.CONFIRMED, OrderAssignmentStage.COMMITTED],
      ['reject', OrderStatus.CONFIRMED, OrderAssignmentStage.COMMITTED],
      ['cancel', OrderStatus.PENDING_REVIEW, OrderAssignmentStage.HOLD],
      ['mark-equipment-retired', OrderStatus.ACTIVE, OrderAssignmentStage.COMMITTED],
      ['mark-equipment-returned', OrderStatus.CONFIRMED, OrderAssignmentStage.COMMITTED],
    ])('returns 422 for invalid %s transitions', async (action, status, stage) => {
      const { orderId } = await createOrderFixture(status, stage);

      const response = await operatorRequest(`/orders/${orderId}/${action}`).expect(422);

      expect(response.body.type).toBe('errors://invalid-order-transition');
      expect(response.body.title).toBe('Invalid Order Transition');
    });

    it.each(['confirm', 'reject', 'cancel', 'mark-equipment-retired', 'mark-equipment-returned'])(
      'returns 404 when %s target is missing',
      async (action) => {
        const missingOrderId = randomUUID();

        const response = await operatorRequest(`/orders/${missingOrderId}/${action}`).expect(404);

        expect(response.body.type).toBe('errors://http-error');
        expect(response.body.title).toBe('NotFoundException');
        expect(response.body.detail).toBe(`Order "${missingOrderId}" was not found.`);
      },
    );

    it('returns 422 and leaves the order pending review when confirmation availability fails', async () => {
      await createOrderFixture(OrderStatus.CONFIRMED, OrderAssignmentStage.COMMITTED);
      const { orderId } = await createOrderFixture(OrderStatus.PENDING_REVIEW, null);

      const response = await operatorRequest(`/orders/${orderId}/confirm`).expect(422);

      expect(response.body.type).toBe('errors://order-items-unavailable');
      expect(response.body.title).toBe('Order Items Unavailable');

      await expectOrderStatus(orderId, OrderStatus.PENDING_REVIEW);
      await expectAssignmentStages(orderId, []);
      await expectOrderReviewAbsent(orderId);
    });

    it('returns 422 and leaves the order pending review when accessory availability fails during confirmation', async () => {
      await createOrderFixture(OrderStatus.CONFIRMED, null, {
        accessories: [{ accessoryRentalItemId: accessoryProductTypeId, quantity: 1 }],
        reserveAccessoryAssets: true,
      });
      const { orderId } = await createOrderFixture(OrderStatus.PENDING_REVIEW, null, {
        accessories: [{ accessoryRentalItemId: accessoryProductTypeId, quantity: 1 }],
      });

      const response = await operatorRequest(`/orders/${orderId}/confirm`).expect(422);

      expect(response.body.type).toBe('errors://order-items-unavailable');
      expect(response.body.accessoryConflicts).toEqual([
        {
          orderItemAccessoryId: expect.any(String),
          accessoryRentalItemId: accessoryProductTypeId,
          requestedCount: 1,
          availableCount: 0,
        },
      ]);

      await expectOrderStatus(orderId, OrderStatus.PENDING_REVIEW);
      await expectAssignmentStages(orderId, []);
      await expectOrderReviewAbsent(orderId);
    });

    it('returns 409 with conflict groups when a confirmed order edit exceeds availability', async () => {
      const { orderId } = await createOrderFixture(OrderStatus.CONFIRMED, OrderAssignmentStage.COMMITTED);

      const response = await request(app.getHttpServer())
        .put(`/orders/${orderId}/edit`)
        .set('Authorization', `Bearer ${createToken(ActorType.USER, operatorUserId)}`)
        .send({
          locationId,
          customerId: null,
          pickupDate: '2026-04-02',
          returnDate: '2026-04-03',
          pickupTime: 600,
          returnTime: 600,
          items: [{ type: 'PRODUCT', productTypeId, quantity: 2 }],
          currency: 'ARS',
          insuranceSelected: false,
          fulfillmentMethod: 'PICKUP',
        })
        .expect(409);

      expect(response.body.type).toBe('errors://order-items-unavailable');
      expect(response.body.title).toBe('Order Items Unavailable');
      expect(response.body.unavailableItems).toEqual([]);
      expect(response.body.conflictGroups).toEqual([
        {
          productTypeId,
          availableCount: 1,
          requestedCount: 2,
          affectedItems: [{ type: 'PRODUCT', productTypeId }],
        },
      ]);
      expect(response.body.accessoryConflicts).toEqual([]);

      await expectOrderStatus(orderId, OrderStatus.CONFIRMED);
      await expectAssignmentStages(orderId, [OrderAssignmentStage.COMMITTED]);
    });

    it('returns 422 when cancellation is blocked by settled owner payouts', async () => {
      const { orderId, orderItemId } = await createOrderFixture(OrderStatus.CONFIRMED, OrderAssignmentStage.COMMITTED, {
        ownerSplitStatus: SplitStatus.SETTLED,
      });

      const response = await operatorRequest(`/orders/${orderId}/cancel`).expect(422);

      expect(response.body.type).toBe('errors://order-cancellation-blocked');
      expect(response.body.title).toBe('Order Cancellation Blocked');

      await expectOrderStatus(orderId, OrderStatus.CONFIRMED);
      await expectAssignmentStages(orderId, [OrderAssignmentStage.COMMITTED]);
      await expectOwnerSplitStatuses(orderItemId, [SplitStatus.SETTLED]);
    });
  });

  async function seedBaseData() {
    await prisma.client.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: { id: tenantId, name: 'Lifecycle Tenant', slug: `lifecycle-${tenantId}`, config: {} },
    });

    await prisma.client.role.upsert({
      where: { id: adminRoleId },
      update: { tenantId, code: 'TENANT_ADMIN', name: 'Admin' },
      create: { id: adminRoleId, tenantId, code: 'TENANT_ADMIN', name: 'Admin' },
    });

    await prisma.client.role.upsert({
      where: { id: limitedRoleId },
      update: { tenantId, code: 'ORDER_VIEWER', name: 'Order Viewer' },
      create: { id: limitedRoleId, tenantId, code: 'ORDER_VIEWER', name: 'Order Viewer' },
    });

    await prisma.client.rolePermission.createMany({
      data: Object.values(Permission).map((permission) => ({
        roleId: adminRoleId,
        permission,
      })),
      skipDuplicates: true,
    });

    await prisma.client.rolePermission.createMany({
      data: [{ roleId: limitedRoleId, permission: Permission.VIEW_ORDERS }],
      skipDuplicates: true,
    });

    await prisma.client.user.upsert({
      where: { id: operatorUserId },
      update: {},
      create: {
        id: operatorUserId,
        tenantId,
        email: 'operator@example.com',
        passwordHash: 'hashed',
        firstName: 'Operator',
        lastName: 'Admin',
      },
    });

    await prisma.client.user.upsert({
      where: { id: limitedOperatorUserId },
      update: {},
      create: {
        id: limitedOperatorUserId,
        tenantId,
        email: 'viewer@example.com',
        passwordHash: 'hashed',
        firstName: 'Limited',
        lastName: 'Operator',
      },
    });

    await prisma.client.userRole.createMany({
      data: [
        { userId: operatorUserId, roleId: adminRoleId },
        { userId: limitedOperatorUserId, roleId: limitedRoleId },
      ],
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
      create: { id: locationId, tenantId, name: 'Lifecycle Location' },
    });

    await prisma.client.owner.upsert({
      where: { id: ownerId },
      update: { tenantId, name: 'Lifecycle Owner' },
      create: { id: ownerId, tenantId, name: 'Lifecycle Owner' },
    });

    await prisma.client.productType.upsert({
      where: { id: productTypeId },
      update: {},
      create: {
        id: productTypeId,
        tenantId,
        billingUnitId,
        name: 'Lifecycle Camera',
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
        name: 'Lifecycle Battery',
        trackingMode: TrackingMode.IDENTIFIED,
        kind: RentalItemKind.ACCESSORY,
        attributes: {},
      },
    });

    await prisma.client.asset.upsert({
      where: { id: assetId },
      update: { ownerId },
      create: { id: assetId, locationId, productTypeId, ownerId, isActive: true },
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
        primaryRentalItemId: productTypeId,
        accessoryRentalItemId: accessoryProductTypeId,
        isDefaultIncluded: false,
        defaultQuantity: 1,
        notes: null,
      },
      create: {
        id: accessoryLinkId,
        tenantId,
        primaryRentalItemId: productTypeId,
        accessoryRentalItemId: accessoryProductTypeId,
        isDefaultIncluded: false,
        defaultQuantity: 1,
        notes: null,
      },
    });

    await prisma.client.ownerContract.upsert({
      where: { id: ownerContractId },
      update: {
        tenantId,
        ownerId,
        assetId,
        ownerShare: '0.70',
        rentalShare: '0.30',
        basis: ContractBasis.NET_COLLECTED,
        validFrom: new Date('2026-01-01T00:00:00.000Z'),
        validUntil: null,
        isActive: true,
      },
      create: {
        id: ownerContractId,
        tenantId,
        ownerId,
        assetId,
        ownerShare: '0.70',
        rentalShare: '0.30',
        basis: ContractBasis.NET_COLLECTED,
        validFrom: new Date('2026-01-01T00:00:00.000Z'),
        validUntil: null,
        isActive: true,
      },
    });

    await prisma.client.promotion.upsert({
      where: { id: promotionId },
      update: {
        tenantId,
        name: 'Lifecycle Promotion',
        type: PromotionType.COUPON,
        priority: 1,
        stackable: false,
        isActive: true,
        condition: {},
        effect: {},
      },
      create: {
        id: promotionId,
        tenantId,
        name: 'Lifecycle Promotion',
        type: PromotionType.COUPON,
        priority: 1,
        stackable: false,
        isActive: true,
        condition: {},
        effect: {},
      },
    });

    await prisma.client.coupon.upsert({
      where: { id: couponId },
      update: {
        tenantId,
        promotionId,
        code: 'LIFECYCLE-COUPON',
        isActive: true,
      },
      create: {
        id: couponId,
        tenantId,
        promotionId,
        code: 'LIFECYCLE-COUPON',
        isActive: true,
      },
    });
  }

  async function createOrderFixture(
    status: OrderStatus,
    assignmentStage: OrderAssignmentStage | null,
    options: {
      couponApplied?: boolean;
      ownerSplitStatus?: SplitStatus;
      accessories?: Array<{ accessoryRentalItemId: string; quantity: number; notes?: string | null }>;
      reserveAccessoryAssets?: boolean;
    } = {},
  ): Promise<CreatedOrder> {
    const orderId = randomUUID();
    const orderItemId = randomUUID();

    createdOrders.push({ orderId, orderItemId });

    await prisma.client.order.create({
      data: {
        id: orderId,
        tenantId,
        locationId,
        couponId: options.couponApplied ? couponId : null,
        status,
        orderNumber: 800000 + createdOrders.length,
        periodStart: TEST_PERIOD.start,
        periodEnd: TEST_PERIOD.end,
      },
    });

    await prisma.client.orderItem.create({
      data: {
        id: orderItemId,
        orderId,
        type: OrderItemType.PRODUCT,
        productTypeId,
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

    if (options.couponApplied) {
      await prisma.client.couponRedemption.create({
        data: {
          couponId,
          orderId,
        },
      });
    }

    if (options.ownerSplitStatus) {
      await prisma.client.orderItemOwnerSplit.create({
        data: {
          orderItemId,
          assetId,
          ownerId,
          contractId: ownerContractId,
          status: options.ownerSplitStatus,
          ownerShare: '0.70',
          rentalShare: '0.30',
          basis: ContractBasis.NET_COLLECTED,
          grossAmount: '100',
          netAmount: '100',
          ownerAmount: '70',
          rentalAmount: '30',
        },
      });
    }

    if (options.accessories) {
      for (const accessory of options.accessories) {
        const orderItemAccessory = await prisma.client.orderItemAccessory.create({
          data: {
            tenantId,
            orderId,
            orderItemId,
            accessoryRentalItemId: accessory.accessoryRentalItemId,
            quantity: accessory.quantity,
            notes: accessory.notes ?? null,
          },
        });

        if (options.reserveAccessoryAssets) {
          await prisma.client.$executeRaw`
            INSERT INTO asset_assignments (
              id,
              asset_id,
              order_item_accessory_id,
              order_id,
              type,
              stage,
              source,
              period,
              created_at,
              updated_at
            ) VALUES (
              ${randomUUID()},
              ${accessoryAssetId},
              ${orderItemAccessory.id},
              ${orderId},
              ${AssignmentType.ORDER}::"AssignmentType",
              ${OrderAssignmentStage.COMMITTED}::"OrderAssignmentStage",
              ${AssignmentSource.OWNED}::"AssignmentSource",
              ${`[${TEST_PERIOD.start.toISOString()}, ${TEST_PERIOD.end.toISOString()})`}::tstzrange,
              NOW(),
              NOW()
            )
          `;
        }
      }
    }

    if (assignmentStage) {
      await prisma.client.$executeRaw`
        INSERT INTO asset_assignments (
          id,
          asset_id,
          order_item_id,
          order_id,
          type,
          stage,
          source,
          period,
          created_at,
          updated_at
        ) VALUES (
          ${randomUUID()},
          ${assetId},
          ${orderItemId},
          ${orderId},
          ${AssignmentType.ORDER}::"AssignmentType",
          ${assignmentStage}::"OrderAssignmentStage",
          ${AssignmentSource.OWNED}::"AssignmentSource",
          ${`[${TEST_PERIOD.start.toISOString()}, ${TEST_PERIOD.end.toISOString()})`}::tstzrange,
          NOW(),
          NOW()
        )
      `;
    }

    return { orderId, orderItemId };
  }

  async function expectOrderStatus(orderId: string, status: OrderStatus) {
    const order = await prisma.client.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true },
    });

    expect(order.status).toBe(status);
  }

  async function expectAssignmentStages(orderId: string, expectedStages: OrderAssignmentStage[]) {
    const assignments = await prisma.client.assetAssignment.findMany({
      where: { orderId },
      select: { stage: true },
      orderBy: { createdAt: 'asc' },
    });

    expect(assignments.map((assignment) => assignment.stage)).toEqual(expectedStages);
  }

  async function expectAccessoryAssignmentCount(orderId: string, expectedCount: number) {
    const assignments = await prisma.client.assetAssignment.findMany({
      where: {
        orderId,
        orderItemAccessoryId: { not: null },
      },
      select: { id: true, stage: true },
      orderBy: { createdAt: 'asc' },
    });

    expect(assignments).toHaveLength(expectedCount);
    expect(assignments.map((assignment) => assignment.stage)).toEqual(
      Array.from({ length: expectedCount }, () => OrderAssignmentStage.COMMITTED),
    );
  }

  async function expectOrderReview(orderId: string, reviewedByUserId: string, rejectionReason: string | null = null) {
    const order = await prisma.client.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { reviewedAt: true, reviewedByUserId: true, rejectionReason: true },
    });

    expect(order.reviewedAt).toBeInstanceOf(Date);
    expect(order.reviewedByUserId).toBe(reviewedByUserId);
    expect(order.rejectionReason).toBe(rejectionReason);
  }

  async function expectOrderReviewAbsent(orderId: string) {
    const order = await prisma.client.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { reviewedAt: true, reviewedByUserId: true, rejectionReason: true },
    });

    expect(order.reviewedAt).toBeNull();
    expect(order.reviewedByUserId).toBeNull();
    expect(order.rejectionReason).toBeNull();
  }

  async function expectOwnerSplitStatuses(orderItemId: string, expectedStatuses: SplitStatus[]) {
    const splits = await prisma.client.orderItemOwnerSplit.findMany({
      where: { orderItemId },
      select: { status: true },
      orderBy: { createdAt: 'asc' },
    });

    expect(splits.map((split) => split.status)).toEqual(expectedStatuses);
  }

  async function expectCouponRedemptionVoided(orderId: string, expectedVoided: boolean) {
    const redemption = await prisma.client.couponRedemption.findUnique({
      where: { orderId },
      select: { voidedAt: true },
    });

    if (expectedVoided) {
      expect(redemption?.voidedAt).not.toBeNull();
      return;
    }

    expect(redemption?.voidedAt ?? null).toBeNull();
  }

  function operatorRequest(url: string) {
    return request(app.getHttpServer())
      .post(url)
      .set('Authorization', `Bearer ${createToken(ActorType.USER, operatorUserId)}`);
  }

  function unauthorizedOperatorRequest(url: string) {
    return request(app.getHttpServer())
      .post(url)
      .set('Authorization', `Bearer ${createToken(ActorType.USER, limitedOperatorUserId)}`);
  }

  function customerRequest(url: string) {
    return request(app.getHttpServer())
      .post(url)
      .set('Authorization', `Bearer ${createToken(ActorType.CUSTOMER, randomUUID())}`);
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
