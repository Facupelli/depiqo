import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';
import { z } from 'zod';

import { RentalCommitmentError, RentalInvalidFieldError } from '../errors/rental-commitment.errors';
import { JsonSnapshot, JsonValue } from './json-snapshot.value-object';

export const ACCEPTED_DELIVERY_SNAPSHOT_SCHEMA = 'v2.accepted-delivery' as const;
export const ACCEPTED_DELIVERY_SNAPSHOT_VERSION = 1 as const;

const nonNegativeDecimal = z.string().refine((value) => {
  try {
    const decimal = new Decimal(value);
    return decimal.isFinite() && !decimal.isNegative();
  } catch {
    return false;
  }
}, 'must be a finite non-negative decimal string');

const legSchema = z
  .object({
    scheduledAt: z.string().datetime(),
    serviceLevel: z.enum(['NORMAL', 'SPECIAL']),
    basePrice: nonNegativeDecimal,
    surcharge: nonNegativeDecimal,
    total: nonNegativeDecimal,
  })
  .superRefine((leg, context) => {
    if (!new Decimal(leg.basePrice).plus(leg.surcharge).equals(leg.total)) {
      context.addIssue({ code: 'custom', path: ['total'], message: 'must equal basePrice plus surcharge' });
    }
  });

const snapshotSchema = z
  .object({
    schema: z.literal(ACCEPTED_DELIVERY_SNAPSHOT_SCHEMA),
    version: z.literal(ACCEPTED_DELIVERY_SNAPSHOT_VERSION),
    resolvedCustomerLocation: z.object({
      formattedAddress: z.string().trim().min(1),
      latitude: z.number().finite().min(-90).max(90),
      longitude: z.number().finite().min(-180).max(180),
      addressLine1: z.string().optional(),
      addressLine2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      providerPlaceId: z.string().optional(),
    }),
    distanceMeters: z.number().int().nonnegative(),
    delivery: legSchema,
    collection: legSchema,
    currency: z.string().trim().min(1),
    deliveryTotal: nonNegativeDecimal,
    transportReservationMinutes: z.number().int().nonnegative(),
  })
  .superRefine((snapshot, context) => {
    if (!new Decimal(snapshot.delivery.total).plus(snapshot.collection.total).equals(snapshot.deliveryTotal)) {
      context.addIssue({
        code: 'custom',
        path: ['deliveryTotal'],
        message: 'must equal delivery.total plus collection.total',
      });
    }
  });

export type AcceptedDeliverySnapshotData = z.infer<typeof snapshotSchema>;

export class AcceptedDeliverySnapshot extends JsonSnapshot {
  private constructor(
    rawValue: JsonValue,
    private readonly data: AcceptedDeliverySnapshotData,
  ) {
    super(rawValue);
  }

  static create(value: unknown): Result<AcceptedDeliverySnapshot, RentalCommitmentError> {
    const parsed = snapshotSchema.safeParse(value);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path.length ? `acceptedDelivery.${issue.path.join('.')}` : 'acceptedDelivery';
      return err(new RentalInvalidFieldError(field, issue?.message ?? 'must be a valid accepted Delivery snapshot'));
    }
    return ok(new AcceptedDeliverySnapshot(toJsonValue(parsed.data), parsed.data));
  }

  get snapshot(): AcceptedDeliverySnapshotData {
    return structuredClone(this.data);
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
  throw new Error('Accepted Delivery snapshot contains a non-JSON value.');
}
