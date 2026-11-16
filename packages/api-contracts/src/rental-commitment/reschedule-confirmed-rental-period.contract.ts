import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ExplicitOffsetInstantWireSchema } from "../explicit-offset-instant.schema";

export const RescheduleConfirmedRentalPeriodParamsSchema = z.object({
  rentalId: z.string().trim().min(1),
});

export const PreviewConfirmedRentalPeriodBodySchema = z.strictObject({
  expectedVersion: z.number().int().nonnegative(),
  period: z.object({
    start: ExplicitOffsetInstantWireSchema,
    end: ExplicitOffsetInstantWireSchema,
  }),
});

/** Decisions are supplied only to PATCH, never to the read-only preview. */
export const RescheduleConfirmedRentalPeriodBodySchema =
  PreviewConfirmedRentalPeriodBodySchema.extend({
    // Required by the application for DELIVERY; optional for PICKUP.
    reviewIdentity: z
      .string()
      .regex(/^v1:[a-f0-9]{64}$/)
      .optional(),
    policyException: z
      .strictObject({
        type: z.literal("AUTHORIZE"),
        reason: z.string().trim().min(1).optional(),
      })
      .optional(),
    acceptReusedTransportReservationMinutes: z.literal(true).optional(),
  });

const ReschedulingCalculatedLegSchema = z.object({
  scheduledAt: z.string().datetime(),
  serviceLevel: z.enum(["NORMAL", "SPECIAL"]),
  basePrice: z.string(),
  surcharge: z.string(),
  total: z.string(),
});

export const PreviewConfirmedRentalPeriodResponseSchema = z.object({
  rentalId: z.string(),
  expectedVersion: z.number().int().nonnegative(),
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  reviewIdentity: z.string().nullable(),
  currency: z.string(),
  proposedAcceptedCustomerTotal: z.string().nullable(),
  // Advisory envelope of the individual reservations, not an availability guarantee.
  reservationPeriod: z
    .object({ start: z.string().datetime(), end: z.string().datetime() })
    .nullable(),
  // Empty only when delivery requirements prevent deriving an operational proposal.
  assetReservations: z.array(
    z.object({
      assetBlockId: z.string(),
      assetId: z.string(),
      period: z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      }),
    }),
  ),
  delivery: z
    .object({
      currentEffectiveCharge: z.string(),
      currentPricingSource: z.enum(["AUTOMATIC", "STAFF_AGREEMENT"]),
      proposedCalculatedReference: z
        .object({
          currency: z.string(),
          distanceMeters: z.number().int().nonnegative(),
          delivery: ReschedulingCalculatedLegSchema,
          collection: ReschedulingCalculatedLegSchema,
          total: z.string(),
        })
        .nullable(),
      proposedEffectiveCharge: z.string().nullable(),
      staffAgreementPreserved: z.boolean(),
      effectiveChargeDifference: z.string().nullable(),
      policyRestrictions: z.array(
        z.enum([
          "NOT_CONFIGURED",
          "DISABLED",
          "BEYOND_MAX_DISTANCE",
          "DELIVERY_OUTSIDE_SERVICE_HOURS",
          "COLLECTION_OUTSIDE_SERVICE_HOURS",
        ]),
      ),
      requiresExceptionAuthorization: z.boolean(),
      transportReservationMinutes: z.number().int().nonnegative().nullable(),
      requiresExplicitMinuteAcceptance: z.boolean(),
    })
    .nullable(),
  // Includes decisions PATCH can resolve and blockers requiring correction elsewhere.
  requirements: z.array(
    z.enum([
      "POLICY_EXCEPTION_AUTHORIZATION_REQUIRED",
      "REUSED_TRANSPORT_RESERVATION_MINUTES_ACCEPTANCE_REQUIRED",
      "TRANSPORT_RESERVATION_MINUTES_REQUIRED",
      "STAFF_AGREEMENT_REQUIRED",
      "CURRENCY_MISMATCH",
      "AUTOMATIC_QUOTE_OR_POLICY_RESTRICTION_REQUIRED",
    ]),
  ),
});

export type PreviewConfirmedRentalPeriodBodyDto = z.infer<
  typeof PreviewConfirmedRentalPeriodBodySchema
>;
export type PreviewConfirmedRentalPeriodResponseDto = z.infer<
  typeof PreviewConfirmedRentalPeriodResponseSchema
>;

export const previewConfirmedRentalPeriodContract = {
  method: "POST",
  path: "/rental-commitments/confirmed-rentals/:rentalId/period/preview",
  params: RescheduleConfirmedRentalPeriodParamsSchema,
  body: PreviewConfirmedRentalPeriodBodySchema,
  response: PreviewConfirmedRentalPeriodResponseSchema,
} satisfies ApiContract<
  typeof RescheduleConfirmedRentalPeriodParamsSchema,
  undefined,
  undefined,
  typeof PreviewConfirmedRentalPeriodBodySchema,
  typeof PreviewConfirmedRentalPeriodResponseSchema
>;

export const RescheduleConfirmedRentalPeriodResponseSchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export type RescheduleConfirmedRentalPeriodParamsDto = z.infer<
  typeof RescheduleConfirmedRentalPeriodParamsSchema
>;
export type RescheduleConfirmedRentalPeriodBodyDto = z.infer<
  typeof RescheduleConfirmedRentalPeriodBodySchema
>;
export type RescheduleConfirmedRentalPeriodResponseDto = z.infer<
  typeof RescheduleConfirmedRentalPeriodResponseSchema
>;

export const rescheduleConfirmedRentalPeriodContract = {
  method: "PATCH",
  path: "/rental-commitments/confirmed-rentals/:rentalId/period",
  params: RescheduleConfirmedRentalPeriodParamsSchema,
  body: RescheduleConfirmedRentalPeriodBodySchema,
  response: RescheduleConfirmedRentalPeriodResponseSchema,
} satisfies ApiContract<
  typeof RescheduleConfirmedRentalPeriodParamsSchema,
  undefined,
  undefined,
  typeof RescheduleConfirmedRentalPeriodBodySchema,
  typeof RescheduleConfirmedRentalPeriodResponseSchema
>;
