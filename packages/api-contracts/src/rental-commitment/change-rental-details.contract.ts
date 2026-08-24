import { z } from "zod";

import type { ApiContract } from "../api-contract";
import {
  CreateConfirmedRentalDeliveryDetailsSchema,
  CreateConfirmedRentalFulfillmentMethodSchema,
} from "./create-confirmed-rental.contract";

export const ChangeRentalDetailsParamsSchema = z.object({
  rentalId: z.string().trim().min(1),
});

export const ChangeRentalDetailsBodySchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  fulfillmentMethod: CreateConfirmedRentalFulfillmentMethodSchema.optional(),
  deliveryDetails: CreateConfirmedRentalDeliveryDetailsSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  insuranceSelected: z.boolean().optional(),
  manualPricingAdjustment: z
    .object({
      mode: z.literal("TARGET_TOTAL"),
      targetTotal: z.string().trim().min(1),
      reason: z.string().trim().min(1).optional(),
    })
    .nullable()
    .optional(),
});

export const ChangeRentalDetailsResponseSchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export type ChangeRentalDetailsParamsDto = z.infer<typeof ChangeRentalDetailsParamsSchema>;
export type ChangeRentalDetailsBodyDto = z.infer<typeof ChangeRentalDetailsBodySchema>;
export type ChangeRentalDetailsResponseDto = z.infer<typeof ChangeRentalDetailsResponseSchema>;

export const changeRentalDetailsContract = {
  method: "PATCH",
  path: "/rental-commitments/confirmed-rentals/:rentalId/details",
  params: ChangeRentalDetailsParamsSchema,
  body: ChangeRentalDetailsBodySchema,
  response: ChangeRentalDetailsResponseSchema,
} satisfies ApiContract<
  typeof ChangeRentalDetailsParamsSchema,
  undefined,
  undefined,
  typeof ChangeRentalDetailsBodySchema,
  typeof ChangeRentalDetailsResponseSchema
>;
