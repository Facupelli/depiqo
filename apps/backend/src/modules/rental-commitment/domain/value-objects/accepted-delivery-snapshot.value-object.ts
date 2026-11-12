import Decimal from 'decimal.js';

import { Prisma } from 'src/generated/prisma/client';
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
    serviceLevel: z.enum(['NORMAL', 'SPECIAL']).optional(),
    basePrice: nonNegativeDecimal.optional(),
    surcharge: nonNegativeDecimal.optional(),
    total: nonNegativeDecimal.optional(),
  })
  .superRefine((leg, context) => {
    const values = [leg.serviceLevel, leg.basePrice, leg.surcharge, leg.total];
    if (values.some((value) => value !== undefined) && values.some((value) => value === undefined)) {
      context.addIssue({ code: 'custom', message: 'calculated leg terms must be all present or all absent' });
    }
    if (
      leg.basePrice !== undefined &&
      leg.surcharge !== undefined &&
      leg.total !== undefined &&
      !new Decimal(leg.basePrice).plus(leg.surcharge).equals(leg.total)
    ) {
      context.addIssue({ code: 'custom', path: ['total'], message: 'must equal basePrice plus surcharge' });
    }
  });

const policyExceptionSchema = z.object({
  overriddenRestrictions: z
    .array(
      z.enum([
        'NOT_CONFIGURED',
        'DISABLED',
        'BEYOND_MAX_DISTANCE',
        'DELIVERY_OUTSIDE_SERVICE_HOURS',
        'COLLECTION_OUTSIDE_SERVICE_HOURS',
      ]),
    )
    .min(1)
    .refine((values) => new Set(values).size === values.length, 'must not contain duplicates'),
  reason: z.string().trim().min(1).optional(),
  authorizedBy: z.string().trim().min(1),
  authorizedAt: z.string().datetime(),
});

const snapshotSchema = z
  .object({
    schema: z.literal(ACCEPTED_DELIVERY_SNAPSHOT_SCHEMA),
    version: z.literal(ACCEPTED_DELIVERY_SNAPSHOT_VERSION),
    distanceMeters: z.number().int().nonnegative(),
    delivery: legSchema,
    collection: legSchema,
    currency: z.string().trim().min(1),
    deliveryTotal: nonNegativeDecimal.optional(),
    // The authorization applies to this snapshot's branch, destination, times and reservation minutes.
    branchId: z.string().trim().min(1).optional(),
    resolvedDestination: z
      .object({
        formattedAddress: z.string().trim().min(1),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        providerPlaceId: z.string().trim().min(1).optional(),
      })
      .optional(),
    // Future commands must establish attribution from trusted server context, never request metadata.
    policyException: policyExceptionSchema.optional(),
    // Future agreement-writing commands must establish actor and timestamp from trusted server context.
    staffAgreement: z
      .object({
        amount: nonNegativeDecimal,
        reason: z.string().trim().min(1).optional(),
        agreedBy: z.string().trim().min(1),
        agreedAt: z.string().datetime(),
      })
      .optional(),
    transportReservationMinutes: z.number().int().nonnegative(),
  })
  .superRefine((snapshot, context) => {
    if (Date.parse(snapshot.collection.scheduledAt) <= Date.parse(snapshot.delivery.scheduledAt)) {
      context.addIssue({ code: 'custom', path: ['collection.scheduledAt'], message: 'must be after delivery' });
    }
    const hasQuote = snapshot.deliveryTotal !== undefined;
    if (
      hasQuote !== (snapshot.delivery.total !== undefined) ||
      hasQuote !== (snapshot.collection.total !== undefined)
    ) {
      context.addIssue({ code: 'custom', message: 'automatic quote must be complete or entirely absent' });
    }
    if (!hasQuote && (!snapshot.staffAgreement || !snapshot.policyException)) {
      context.addIssue({
        code: 'custom',
        message: 'without an automatic quote, staff agreement and policy exception are required',
      });
    }
    if (snapshot.policyException && (!snapshot.branchId || !snapshot.resolvedDestination)) {
      context.addIssue({
        code: 'custom',
        path: ['policyException'],
        message: 'requires a branch and resolved destination',
      });
    }
    if (
      snapshot.delivery.total !== undefined &&
      snapshot.collection.total !== undefined &&
      snapshot.deliveryTotal !== undefined &&
      !new Decimal(snapshot.delivery.total).plus(snapshot.collection.total).equals(snapshot.deliveryTotal)
    ) {
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

  static create(
    value: JsonValue | Prisma.JsonValue | Prisma.InputJsonValue,
  ): Result<AcceptedDeliverySnapshot, RentalCommitmentError> {
    const parsed = snapshotSchema.safeParse(value);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path.length ? `acceptedDelivery.${issue.path.join('.')}` : 'acceptedDelivery';
      return err(new RentalInvalidFieldError(field, issue?.message ?? 'must be a valid accepted Delivery snapshot'));
    }
    return ok(new AcceptedDeliverySnapshot(toJsonValue(parsed.data), parsed.data));
  }

  reschedule(params: {
    deliveryScheduledAt: Date;
    collectionScheduledAt: Date;
    // Supplied only after fresh evaluation and authorization by the owning server workflow.
    reauthorizedPolicyException?: AcceptedDeliverySnapshotData['policyException'];
  }): Result<AcceptedDeliverySnapshot, RentalCommitmentError> {
    for (const [field, value] of [
      ['delivery.scheduledAt', params.deliveryScheduledAt],
      ['collection.scheduledAt', params.collectionScheduledAt],
    ] as const) {
      if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
        return err(new RentalInvalidFieldError(`acceptedDelivery.${field}`, 'must be a valid timestamp'));
      }
    }

    const conditionsChanged =
      params.deliveryScheduledAt.getTime() !== Date.parse(this.data.delivery.scheduledAt) ||
      params.collectionScheduledAt.getTime() !== Date.parse(this.data.collection.scheduledAt);
    if (conditionsChanged && this.data.policyException && !params.reauthorizedPolicyException) {
      return err(
        new RentalInvalidFieldError(
          'acceptedDelivery.policyException',
          'changed transportation conditions require reauthorization',
        ),
      );
    }

    return AcceptedDeliverySnapshot.create({
      ...this.snapshot,
      policyException: params.reauthorizedPolicyException ?? this.data.policyException,
      delivery: {
        ...this.data.delivery,
        scheduledAt: params.deliveryScheduledAt.toISOString(),
      },
      collection: {
        ...this.data.collection,
        scheduledAt: params.collectionScheduledAt.toISOString(),
      },
    });
  }

  get effectiveDeliveryCharge(): string {
    // Construction guarantees an agreement whenever the calculated total is absent.
    return this.data.staffAgreement?.amount ?? this.data.deliveryTotal!;
  }

  get snapshot(): AcceptedDeliverySnapshotData {
    return structuredClone(this.data);
  }
}

function toJsonValue(value: JsonValue | undefined): JsonValue {
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
