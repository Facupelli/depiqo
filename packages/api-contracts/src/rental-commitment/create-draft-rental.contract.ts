import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ExplicitOffsetInstantWireSchema } from "../explicit-offset-instant.schema";
import {
  CreateConfirmedRentalDeliveryDetailsSchema,
  CreateConfirmedRentalFulfillmentMethodSchema,
  CreateConfirmedRentalSelectedOfferSchema,
} from "./create-confirmed-rental.contract";

export const CreateDraftRentalManualPricingAdjustmentSchema = z.object({
  mode: z.literal("TARGET_TOTAL"),
  targetTotal: z.string().trim().min(1),
  reason: z.string().trim().optional(),
});

export const CreateDraftRentalBodySchema = z
  .object({
    branchId: z.string().trim().min(1),
    rentalCustomerId: z.string().trim().min(1).optional(),
    period: z.object({
      start: ExplicitOffsetInstantWireSchema,
      end: ExplicitOffsetInstantWireSchema,
    }),
    selectedOffers: z
      .array(CreateConfirmedRentalSelectedOfferSchema)
      .default([]),
    fulfillmentMethod:
      CreateConfirmedRentalFulfillmentMethodSchema.default("PICKUP"),
    deliveryDetails: CreateConfirmedRentalDeliveryDetailsSchema.optional(),
    notes: z.string().optional(),
    insuranceSelected: z.boolean().optional(),
    manualPricingAdjustment:
      CreateDraftRentalManualPricingAdjustmentSchema.optional(),
  })
  .transform((value) => ({
    ...value,
    deliveryDetails:
      value.fulfillmentMethod === "DELIVERY"
        ? value.deliveryDetails
        : undefined,
  }));

export const CreateDraftRentalResponseSchema = z.object({
  id: z.string(),
});

export type CreateDraftRentalManualPricingAdjustmentDto = z.infer<
  typeof CreateDraftRentalManualPricingAdjustmentSchema
>;
export type CreateDraftRentalBodyDto = z.input<
  typeof CreateDraftRentalBodySchema
>;
export type CreateDraftRentalResponseDto = z.infer<
  typeof CreateDraftRentalResponseSchema
>;

export const createDraftRentalContract = {
  method: "POST",
  path: "/rental-commitments/draft-rentals",
  body: CreateDraftRentalBodySchema,
  response: CreateDraftRentalResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof CreateDraftRentalBodySchema,
  typeof CreateDraftRentalResponseSchema
>;
