import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';
import { z } from 'zod';

import {
  ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA,
  ACCEPTED_RENTAL_PRICING_SNAPSHOT_VERSION,
  AcceptedRentalPricingSnapshot,
} from './accepted-pricing-snapshot.type';
import { RentalCommitmentError, RentalInvalidFieldError } from '../errors/rental-commitment.errors';
import { JsonSnapshot, JsonValue } from './json-snapshot.value-object';

const decimalString = z.string().refine(isValidDecimal, 'must be a valid decimal string');
const direction = z.enum(['INCREASE', 'DECREASE', 'NONE']);
const lineSchema = z.object({
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
      direction,
      amount: decimalString,
      setByTenantUserId: z.string(),
      setAtIso: z.string(),
      reason: z.string().optional(),
    })
    .optional(),
});
const breakdownSchema = z.object({
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
  lines: z.array(lineSchema),
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
    .object({ couponId: z.string(), code: z.string(), promotionId: z.string(), amount: decimalString })
    .optional(),
});
const acceptedSnapshotSchema: z.ZodType<AcceptedRentalPricingSnapshot> = z
  .object({
    schema: z.literal(ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA),
    version: z.literal(ACCEPTED_RENTAL_PRICING_SNAPSHOT_VERSION),
    calculatedAtIso: z.string().min(1),
    context: z.enum(['DRAFT', 'CONFIRMED', 'CONFIRM_DRAFT', 'REPRICE']),
    calculated: breakdownSchema,
    final: breakdownSchema,
    manualPricingAdjustment: z
      .object({
        mode: z.literal('TARGET_TOTAL'),
        targetTotal: decimalString,
        previousTotal: decimalString,
        direction,
        adjustmentTotal: decimalString,
        setByTenantUserId: z.string(),
        setAtIso: z.string(),
        reason: z.string().optional(),
      })
      .optional(),
    insurance: z.object({ applied: z.boolean(), amount: decimalString }),
    totalBeforeInsurance: decimalString,
    total: decimalString,
  })
  .superRefine((snapshot, context) => {
    const finalTotal = parseFiniteDecimal(snapshot.final.total);
    const totalBeforeInsurance = parseFiniteDecimal(snapshot.totalBeforeInsurance);
    const insuranceAmount = parseFiniteDecimal(snapshot.insurance.amount);
    const total = parseFiniteDecimal(snapshot.total);

    if (!finalTotal || !totalBeforeInsurance || !insuranceAmount || !total) return;

    if (!totalBeforeInsurance.equals(finalTotal))
      context.addIssue({ code: 'custom', path: ['totalBeforeInsurance'], message: 'must equal final.total' });
    if (!totalBeforeInsurance.plus(insuranceAmount).equals(total))
      context.addIssue({ code: 'custom', path: ['total'], message: 'must equal final.total plus insurance.amount' });
    if (!snapshot.insurance.applied && (snapshot.insurance.amount !== '0.00' || !total.equals(finalTotal)))
      context.addIssue({
        code: 'custom',
        path: ['insurance'],
        message: 'must have amount 0.00 and no effect on total when not applied',
      });
  });

export class ConfirmedPriceSnapshot extends JsonSnapshot {
  private constructor(
    rawValue: JsonValue,
    private readonly acceptedSnapshot: AcceptedRentalPricingSnapshot,
  ) {
    super(rawValue);
  }

  static create(value: unknown): Result<ConfirmedPriceSnapshot, RentalCommitmentError> {
    const parsed = acceptedSnapshotSchema.safeParse(value);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path.length ? `priceSnapshot.${issue.path.join('.')}` : 'priceSnapshot';
      return err(new RentalInvalidFieldError(field, issue?.message ?? 'must be a valid accepted pricing snapshot'));
    }
    return ok(new ConfirmedPriceSnapshot(toJsonValue(parsed.data), parsed.data));
  }

  get snapshot(): AcceptedRentalPricingSnapshot {
    return structuredClone(this.acceptedSnapshot);
  }
}

function isValidDecimal(value: string): boolean {
  return parseFiniteDecimal(value) !== null;
}

function parseFiniteDecimal(value: string): Decimal | null {
  try {
    const decimal = new Decimal(value);
    return decimal.isFinite() ? decimal : null;
  } catch {
    return null;
  }
}

function toJsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return value;
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nested]) => nested !== undefined)
        .map(([key, nested]) => [key, toJsonValue(nested)]),
    );
  }
  throw new Error('Accepted pricing snapshot contains a non-JSON value.');
}
