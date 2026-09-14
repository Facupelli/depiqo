import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ExplicitOffsetInstantWireSchema } from "../explicit-offset-instant.schema";

export const RescheduleConfirmedRentalPeriodParamsSchema = z.object({
  rentalId: z.string().trim().min(1),
});

export const RescheduleConfirmedRentalPeriodBodySchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  period: z.object({
    start: ExplicitOffsetInstantWireSchema,
    end: ExplicitOffsetInstantWireSchema,
  }),
});

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
