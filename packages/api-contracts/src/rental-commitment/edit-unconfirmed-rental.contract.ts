import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ExplicitOffsetInstantWireSchema } from "../explicit-offset-instant.schema";
import {
  CreateConfirmedRentalFulfillmentMethodSchema,
  CreateConfirmedRentalSelectedOfferSchema,
} from "./create-confirmed-rental.contract";
import {
  CreateDraftRentalDeliveryDetailsSchema,
  CreateDraftRentalManualPricingAdjustmentSchema,
} from "./create-draft-rental.contract";

const EditUnconfirmedRentalDeliveryDetailsSchema =
  CreateDraftRentalDeliveryDetailsSchema.omit({ locationId: true });

export const EditUnconfirmedRentalParamsSchema = z.object({
  rentalId: z.string().trim().min(1),
});

export const EditUnconfirmedRentalBodySchema = z
  .object({
    expectedVersion: z.number().int().nonnegative(),
    branchId: z.string().trim().min(1),
    period: z.object({
      start: ExplicitOffsetInstantWireSchema,
      end: ExplicitOffsetInstantWireSchema,
    }),
    selectedOffers: z
      .array(CreateConfirmedRentalSelectedOfferSchema)
      .default([]),
    fulfillmentMethod: CreateConfirmedRentalFulfillmentMethodSchema,
    deliveryDetails: EditUnconfirmedRentalDeliveryDetailsSchema.optional(),
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
