import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ExplicitOffsetInstantSchema } from "../explicit-offset-instant.schema";
import {
  CreateConfirmedRentalDeliveryDetailsSchema,
  CreateConfirmedRentalFulfillmentMethodSchema,
  CreateConfirmedRentalSelectedOfferSchema,
} from "./create-confirmed-rental.contract";
import { CreateDraftRentalManualPricingAdjustmentSchema } from "./create-draft-rental.contract";

export const EditUnconfirmedRentalParamsSchema = z.object({
  rentalId: z.string().trim().min(1),
});

export const EditUnconfirmedRentalBodySchema = z
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
      CreateDraftRentalManualPricingAdjustmentSchema.optional(),
  })
  .transform((value) => ({
    ...value,
    deliveryDetails:
      value.fulfillmentMethod === "DELIVERY"
        ? value.deliveryDetails
        : undefined,
  }));

export const EditUnconfirmedRentalResponseSchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export type EditUnconfirmedRentalParamsDto = z.infer<
  typeof EditUnconfirmedRentalParamsSchema
>;
export type EditUnconfirmedRentalBodyDto = z.input<
  typeof EditUnconfirmedRentalBodySchema
>;
export type EditUnconfirmedRentalResponseDto = z.infer<
  typeof EditUnconfirmedRentalResponseSchema
>;

export const editUnconfirmedRentalContract = {
  method: "PUT",
  path: "/rental-commitments/rentals/:rentalId",
  params: EditUnconfirmedRentalParamsSchema,
  body: EditUnconfirmedRentalBodySchema,
  response: EditUnconfirmedRentalResponseSchema,
} satisfies ApiContract<
  typeof EditUnconfirmedRentalParamsSchema,
  undefined,
  undefined,
  typeof EditUnconfirmedRentalBodySchema,
  typeof EditUnconfirmedRentalResponseSchema
>;
