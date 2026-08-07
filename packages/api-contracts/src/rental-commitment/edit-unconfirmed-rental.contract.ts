import { z } from "zod";

import type { ApiContract } from "../api-contract";
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
    expectedUpdatedAt: z.string().datetime(),
    branchId: z.string().trim().min(1),
    period: z.object({
      start: z.coerce.date(),
      end: z.coerce.date(),
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
  updatedAt: z.string().datetime(),
});

export type EditUnconfirmedRentalParamsDto = z.infer<
  typeof EditUnconfirmedRentalParamsSchema
>;
export type EditUnconfirmedRentalBodyDto = z.infer<
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
