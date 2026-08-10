import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ExplicitOffsetInstantSchema } from "../explicit-offset-instant.schema";
import {
  CreateConfirmedRentalDeliveryDetailsSchema,
  CreateConfirmedRentalFulfillmentMethodSchema,
  CreateConfirmedRentalSelectedOfferSchema,
} from "./create-confirmed-rental.contract";
import { CreateDraftRentalManualPricingAdjustmentSchema } from "./create-draft-rental.contract";

export const EditConfirmedRentalParamsSchema = z.object({
  rentalId: z.string().trim().min(1),
});

export const EditConfirmedRentalBodySchema = z
  .object({
    expectedVersion: z.number().int().nonnegative(),
    branchId: z.string().trim().min(1),
    period: z.object({
      start: ExplicitOffsetInstantSchema,
      end: ExplicitOffsetInstantSchema,
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
      CreateDraftRentalManualPricingAdjustmentSchema.nullable()
        .default(null)
        .describe(
          "Applies a new manual adjustment when present. Null applies no manual adjustment if this edit recalculates pricing; details-only edits retain the existing accepted price snapshot.",
        ),
  })
  .transform((value) => ({
    ...value,
    deliveryDetails:
      value.fulfillmentMethod === "DELIVERY"
        ? value.deliveryDetails
        : undefined,
  }));

export const EditConfirmedRentalResponseSchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export type EditConfirmedRentalParamsDto = z.infer<
  typeof EditConfirmedRentalParamsSchema
>;
export type EditConfirmedRentalBodyDto = z.input<
  typeof EditConfirmedRentalBodySchema
>;
export type EditConfirmedRentalResponseDto = z.infer<
  typeof EditConfirmedRentalResponseSchema
>;

export const editConfirmedRentalContract = {
  method: "PUT",
  path: "/rental-commitments/confirmed-rentals/:rentalId",
  params: EditConfirmedRentalParamsSchema,
  body: EditConfirmedRentalBodySchema,
  response: EditConfirmedRentalResponseSchema,
} satisfies ApiContract<
  typeof EditConfirmedRentalParamsSchema,
  undefined,
  undefined,
  typeof EditConfirmedRentalBodySchema,
  typeof EditConfirmedRentalResponseSchema
>;
