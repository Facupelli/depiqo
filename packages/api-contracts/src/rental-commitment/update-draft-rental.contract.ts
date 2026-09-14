import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ExplicitOffsetInstantWireSchema } from "../explicit-offset-instant.schema";
import {
  CreateDraftRentalManualPricingAdjustmentSchema,
} from "./create-draft-rental.contract";
import { CreateConfirmedRentalSelectedOfferSchema } from "./create-confirmed-rental.contract";

export const UpdateDraftRentalParamsSchema = z.object({
  rentalId: z.string().trim().min(1),
});

export const UpdateDraftRentalDeliveryIntentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("KEEP_CURRENT") }),
  z.object({
    type: z.literal("NEW_DESTINATION"),
    address: z.string().trim().min(1),
    locationId: z.string().trim().min(1),
  }),
]);

const UpdateDraftRentalProposalSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  branchId: z.string().trim().min(1),
  rentalCustomerId: z.string().trim().min(1).optional(),
  period: z.object({
    start: ExplicitOffsetInstantWireSchema,
    end: ExplicitOffsetInstantWireSchema,
  }),
  selectedOffers: z.array(CreateConfirmedRentalSelectedOfferSchema),
  insuranceSelected: z.boolean().optional(),
  manualPricingAdjustment: CreateDraftRentalManualPricingAdjustmentSchema.optional(),
});

export const UpdateDraftRentalBodySchema = UpdateDraftRentalProposalSchema.extend({
  fulfillmentMethod: z.enum(["PICKUP", "DELIVERY"]),
  deliveryIntent: UpdateDraftRentalDeliveryIntentSchema.optional(),
}).superRefine((value, context) => {
  if (value.fulfillmentMethod === "DELIVERY" && !value.deliveryIntent) {
    context.addIssue({
      code: "custom",
      path: ["deliveryIntent"],
      message: "Delivery rentals require a delivery intent.",
    });
  }
  if (value.fulfillmentMethod === "PICKUP" && value.deliveryIntent) {
    context.addIssue({
      code: "custom",
      path: ["deliveryIntent"],
      message: "Pickup rentals cannot include a delivery intent.",
    });
  }
});

export const UpdateDraftRentalResponseSchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export type UpdateDraftRentalParamsDto = z.infer<typeof UpdateDraftRentalParamsSchema>;
export type UpdateDraftRentalBodyDto = z.infer<typeof UpdateDraftRentalBodySchema>;
export type UpdateDraftRentalResponseDto = z.infer<typeof UpdateDraftRentalResponseSchema>;

export const updateDraftRentalContract = {
  method: "PUT",
  path: "/rental-commitments/draft-rentals/:rentalId",
  params: UpdateDraftRentalParamsSchema,
  body: UpdateDraftRentalBodySchema,
  response: UpdateDraftRentalResponseSchema,
} satisfies ApiContract<
  typeof UpdateDraftRentalParamsSchema,
  undefined,
  undefined,
  typeof UpdateDraftRentalBodySchema,
  typeof UpdateDraftRentalResponseSchema
>;
