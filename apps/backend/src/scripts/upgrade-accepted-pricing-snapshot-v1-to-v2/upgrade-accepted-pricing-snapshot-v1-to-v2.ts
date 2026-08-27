import 'dotenv/config';

import Decimal from 'decimal.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';

import { Prisma, PrismaClient, V2RentalSource } from '../../generated/prisma/client';
import {
  ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA,
  ACCEPTED_RENTAL_PRICING_SNAPSHOT_VERSION,
} from '../../modules/rental-commitment/domain/value-objects/accepted-pricing-snapshot.type';
import { ConfirmedPriceSnapshot } from '../../modules/rental-commitment/domain/value-objects/confirmed-price-snapshot.value-object';

const decimalString = z.string().refine(isFiniteDecimal, 'must be a finite decimal string');
const directionSchema = z.enum(['INCREASE', 'DECREASE', 'NONE']);

const pricingLineV1Schema = z.object({
  rentalSelectionId: z.string(),
  rentalOfferId: z.string(),
  rentableItemId: z.string(),
  rentableItemName: z.string(),
  categoryId: z.string().optional(),
  quantity: z.number(),
  chargedUnits: z.number(),
  billingUnit: z.enum(['HOUR', 'DAY', 'WEEK']),
  ratePlanId: z.string().optional(),
  appliedTierId: z.string().optional(),
  pricePerUnit: decimalString,
  subtotal: decimalString,
  discountTotal: decimalString,
  total: decimalString,
  appliedAdjustments: z.array(
    z.object({
      type: z.enum(['PROMOTION', 'COUPON']),
      promotionId: z.string(),
      couponId: z.string().optional(),
      name: z.string(),
      amount: decimalString,
    }),
  ),
  manualPricingAdjustment: z
    .object({
      mode: z.literal('TARGET_TOTAL_ALLOCATION'),
      direction: directionSchema,
      amount: decimalString,
      setByTenantUserId: z.string(),
      setAtIso: z.string(),
      reason: z.string().optional(),
    })
    .optional(),
});

const pricingBreakdownV1Schema = z.object({
  currency: z.string().trim().min(1),
  subtotal: decimalString,
  discountTotal: decimalString,
  total: decimalString,
  chargedDays: z.number().int().nonnegative(),
  durationPolicySnapshot: z.object({
    timezone: z.string().min(1),
    dailyBillingPolicy: z.enum([
      'IGNORE_PARTIAL_DAY',
      'BILL_OVER_QUARTER_DAY',
      'BILL_OVER_HALF_DAY',
      'BILL_ANY_PARTIAL_DAY',
    ]),
    weekendCountsAsOne: z.boolean(),
    minimumChargedDays: z.number(),
    quarterDayThresholdMinutes: z.number().optional(),
    halfDayThresholdMinutes: z.number().optional(),
  }),
  lines: z.array(pricingLineV1Schema),
  appliedPromotions: z.array(
    z.object({
      promotionId: z.string(),
      name: z.string(),
      activation: z.enum(['AUTOMATIC', 'COUPON_REQUIRED']),
      effectType: z.enum(['PERCENTAGE_OFF', 'FIXED_AMOUNT_OFF']),
      effectValue: z.string(),
      target: z.enum(['ORDER', 'ELIGIBLE_LINES']),
      amount: decimalString,
    }),
  ),
  appliedCoupon: z
    .object({
      couponId: z.string(),
      code: z.string(),
      promotionId: z.string(),
      amount: decimalString,
    })
    .optional(),
});

const acceptedPricingSnapshotV1Schema = z.object({
  schema: z.literal(ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA),
  version: z.literal(1),
  calculatedAtIso: z.string().min(1),
  context: z.enum(['DRAFT', 'CONFIRMED', 'CONFIRM_DRAFT', 'REPRICE']),
  calculated: pricingBreakdownV1Schema,
  final: pricingBreakdownV1Schema,
  manualPricingAdjustment: z
    .object({
      mode: z.literal('TARGET_TOTAL'),
      targetTotal: decimalString,
      previousTotal: decimalString,
      direction: directionSchema,
      adjustmentTotal: decimalString,
      setByTenantUserId: z.string(),
      setAtIso: z.string(),
      reason: z.string().optional(),
    })
    .optional(),
});

const legacyFinancialSnapshotSchema = z.object({
  insuranceApplied: z.boolean(),
  insuranceAmount: decimalString,
  itemsSubtotal: decimalString,
  total: decimalString,
});

type ScriptOptions = {
  tenantId: string;
  write: boolean;
};

type CandidateRental = {
  id: string;
  tenantId: string;
  rentalNumber: number;
  priceSnapshot: Prisma.JsonValue | null;
  version: number;
  source: V2RentalSource | null;
};

type ValidUpgrade = {
  rental: CandidateRental;
  snapshot: Prisma.JsonValue;
  insured: boolean;
};

type UpgradeFailure = {
  rentalId: string;
  rentalNumber: number;
  reason: string;
};

function parseOptions(args: string[]): ScriptOptions {
  let tenantId: string | undefined;
  let write = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--tenantId') {
      if (tenantId !== undefined) throw new Error('--tenantId may only be provided once');
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error('Missing value for --tenantId');
      tenantId = value;
      index += 1;
      continue;
    }
    if (argument === '--write') {
      if (write) throw new Error('--write may only be provided once');
      write = true;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!tenantId?.trim()) throw new Error('Missing required argument: --tenantId <tenant-id>');
  return { tenantId: tenantId.trim(), write };
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    console.log(`[snapshot-upgrade] Tenant: ${options.tenantId}`);
    console.log(`[snapshot-upgrade] Mode: ${options.write ? 'write' : 'dry-run'}`);

    const candidates = await findV1Rentals(prisma, options.tenantId);
    const orders = await prisma.order.findMany({
      where: { tenantId: options.tenantId, id: { in: candidates.map((candidate) => candidate.id) } },
      select: { id: true, financialSnapshot: true },
    });
    const ordersById = new Map(orders.map((order) => [order.id, order]));
    const validUpgrades: ValidUpgrade[] = [];
    const failures: UpgradeFailure[] = [];

    for (const rental of candidates) {
      const order = ordersById.get(rental.id);
      if (!order && rental.source === V2RentalSource.FORMAL) {
        failures.push(failure(rental, 'matching legacy Order was not found for a migrated FORMAL rental'));
        continue;
      }

      const result = order
        ? buildLegacyUpgrade(rental, order.financialSnapshot)
        : buildNativeV2Upgrade(rental);
      if (typeof result === 'string') failures.push(failure(rental, result));
      else validUpgrades.push(result);
    }

    printSummary(candidates.length, validUpgrades, failures);

    if (failures.length > 0) {
      process.exitCode = 1;
      if (options.write) console.error('[snapshot-upgrade] Write refused because preflight failed.');
      return;
    }

    if (!options.write) return;

    for (const upgrade of validUpgrades) {
      const updated = await prisma.v2Rental.updateMany({
        where: {
          id: upgrade.rental.id,
          tenantId: upgrade.rental.tenantId,
          version: upgrade.rental.version,
        },
        data: {
          priceSnapshot: upgrade.snapshot,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new Error(
          `Optimistic update failed for rentalId=${upgrade.rental.id}, rentalNumber=${upgrade.rental.rentalNumber}; expected one updated row, got ${updated.count}`,
        );
      }
    }

    await verifyWrites(prisma, options.tenantId, validUpgrades);
    console.log(`[snapshot-upgrade] Successfully upgraded and verified ${validUpgrades.length} snapshot(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

async function findV1Rentals(prisma: PrismaClient, tenantId: string): Promise<CandidateRental[]> {
  return prisma.v2Rental.findMany({
    where: {
      tenantId,
      AND: [
        { priceSnapshot: { path: ['schema'], equals: ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA } },
        { priceSnapshot: { path: ['version'], equals: 1 } },
      ],
    },
    select: {
      id: true,
      tenantId: true,
      rentalNumber: true,
      priceSnapshot: true,
      version: true,
      source: true,
    },
    orderBy: { id: 'asc' },
  });
}

function buildLegacyUpgrade(rental: CandidateRental, financialSnapshot: Prisma.JsonValue): ValidUpgrade | string {
  const parsedV1 = acceptedPricingSnapshotV1Schema.safeParse(rental.priceSnapshot);
  if (!parsedV1.success) return `invalid V1 snapshot: ${firstZodIssue(parsedV1.error)}`;

  const parsedFinancial = legacyFinancialSnapshotSchema.safeParse(financialSnapshot);
  if (!parsedFinancial.success) return `invalid legacy financial snapshot: ${firstZodIssue(parsedFinancial.error)}`;

  const v1 = parsedV1.data;
  const financial = parsedFinancial.data;
  const equipmentTotal = new Decimal(v1.final.total);
  const itemsSubtotal = new Decimal(financial.itemsSubtotal);
  const insuranceAmount = new Decimal(financial.insuranceAmount);
  const total = new Decimal(financial.total);

  if (!equipmentTotal.equals(itemsSubtotal)) {
    return `financial identity mismatch: V1 final.total ${equipmentTotal.toString()} != legacy itemsSubtotal ${itemsSubtotal.toString()}`;
  }
  if (!total.equals(itemsSubtotal.plus(insuranceAmount))) {
    return `financial identity mismatch: legacy total ${total.toString()} != itemsSubtotal + insuranceAmount ${itemsSubtotal.plus(insuranceAmount).toString()}`;
  }
  if (!financial.insuranceApplied && !insuranceAmount.isZero()) {
    return `financial identity mismatch: insuranceApplied is false but insuranceAmount is ${insuranceAmount.toString()}`;
  }

  return validateUpgrade(rental, v1, financial.insuranceApplied, insuranceAmount.toFixed(2), total.toString());
}

function buildNativeV2Upgrade(rental: CandidateRental): ValidUpgrade | string {
  const parsedV1 = acceptedPricingSnapshotV1Schema.safeParse(rental.priceSnapshot);
  if (!parsedV1.success) return `invalid V1 snapshot: ${firstZodIssue(parsedV1.error)}`;

  // Insurance pricing was disabled while native V2 rentals wrote version-1 snapshots.
  // Migrated rentals are FORMAL and must instead reconcile against their legacy Order.
  return validateUpgrade(rental, parsedV1.data, false, '0.00', parsedV1.data.final.total);
}

function validateUpgrade(
  rental: CandidateRental,
  v1: z.infer<typeof acceptedPricingSnapshotV1Schema>,
  insuranceApplied: boolean,
  insuranceAmount: string,
  total: string,
): ValidUpgrade | string {
  const candidate = {
    ...v1,
    version: ACCEPTED_RENTAL_PRICING_SNAPSHOT_VERSION,
    insurance: { applied: insuranceApplied, amount: insuranceAmount },
    totalBeforeInsurance: v1.final.total,
    total,
  };
  const validation = ConfirmedPriceSnapshot.create(candidate);
  if (validation.isErr()) return `current snapshot validation failed: ${validation.error.message}`;

  return {
    rental,
    snapshot: validation.value.toJSON() as Prisma.JsonValue,
    insured: insuranceApplied,
  };
}

async function verifyWrites(prisma: PrismaClient, tenantId: string, upgrades: ValidUpgrade[]): Promise<void> {
  const remainingV1 = await findV1Rentals(prisma, tenantId);
  if (remainingV1.length !== 0) {
    throw new Error(`Post-write verification failed: ${remainingV1.length} V1 snapshot(s) remain`);
  }

  const upgradedRentals = await prisma.v2Rental.findMany({
    where: { tenantId, id: { in: upgrades.map((upgrade) => upgrade.rental.id) } },
    select: { id: true, rentalNumber: true, priceSnapshot: true },
  });
  if (upgradedRentals.length !== upgrades.length) {
    throw new Error(`Post-write verification failed: expected ${upgrades.length} upgraded rental(s), found ${upgradedRentals.length}`);
  }

  for (const rental of upgradedRentals) {
    const validation = ConfirmedPriceSnapshot.create(rental.priceSnapshot);
    if (validation.isErr()) {
      throw new Error(
        `Post-write validation failed for rentalId=${rental.id}, rentalNumber=${rental.rentalNumber}: ${validation.error.message}`,
      );
    }
  }
}

function printSummary(total: number, upgrades: ValidUpgrade[], failures: UpgradeFailure[]): void {
  console.log('[snapshot-upgrade] Preflight summary');
  console.log(`  V1 snapshots found: ${total}`);
  console.log(`  Valid upgrades: ${upgrades.length}`);
  console.log(`  Historically insured: ${upgrades.filter((upgrade) => upgrade.insured).length}`);
  console.log(`  Historically uninsured: ${upgrades.filter((upgrade) => !upgrade.insured).length}`);
  console.log(`  Failures: ${failures.length}`);

  for (const item of failures) {
    console.error(`  FAILURE rentalId=${item.rentalId} rentalNumber=${item.rentalNumber}: ${item.reason}`);
  }
}

function failure(rental: CandidateRental, reason: string): UpgradeFailure {
  return { rentalId: rental.id, rentalNumber: rental.rentalNumber, reason };
}

function firstZodIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'unknown validation error';
  const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
  return `${path}${issue.message}`;
}

function isFiniteDecimal(value: string): boolean {
  try {
    return new Decimal(value).isFinite();
  } catch {
    return false;
  }
}

main().catch((error: unknown) => {
  console.error('[snapshot-upgrade] Failed');
  console.error(error);
  process.exitCode = 1;
});
