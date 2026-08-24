import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ExplicitOffsetInstantWireSchema } from "../explicit-offset-instant.schema";

export const ChangeRentalPeriodParamsSchema = z.object({
  rentalId: z.string().trim().min(1),
});

export const ChangeRentalPeriodBodySchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  start: ExplicitOffsetInstantWireSchema,
  end: ExplicitOffsetInstantWireSchema,
});

export const ChangeRentalPeriodResponseSchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export type ChangeRentalPeriodParamsDto = z.infer<typeof ChangeRentalPeriodParamsSchema>;
export type ChangeRentalPeriodBodyDto = z.infer<typeof ChangeRentalPeriodBodySchema>;
export type ChangeRentalPeriodResponseDto = z.infer<typeof ChangeRentalPeriodResponseSchema>;

export const changeRentalPeriodContract = {
  method: "PATCH",
  path: "/rental-commitments/confirmed-rentals/:rentalId/period",
  params: ChangeRentalPeriodParamsSchema,
  body: ChangeRentalPeriodBodySchema,
  response: ChangeRentalPeriodResponseSchema,
} satisfies ApiContract<
  typeof ChangeRentalPeriodParamsSchema,
  undefined,
  undefined,
  typeof ChangeRentalPeriodBodySchema,
  typeof ChangeRentalPeriodResponseSchema
>;
