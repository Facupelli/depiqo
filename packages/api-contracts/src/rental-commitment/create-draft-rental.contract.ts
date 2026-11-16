import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ExplicitOffsetInstantWireSchema } from "../explicit-offset-instant.schema";
import { PayableTargetTotalSchema } from "../pricing/payable-target-total.schema";
import {
  CreateDraftRentalDeliveryDecisionsSchema,
  validateNewStaffArrangedDeliveryDecisions,
} from "./draft-rental-delivery-decisions.schema";
import {
  DraftRentalRoutedDestinationSchema,
  DraftRentalStaffArrangedDestinationSchema,
} from "./draft-rental-delivery-destination.schema";
import {
  CreateConfirmedRentalFulfillmentMethodSchema,
  CreateConfirmedRentalSelectedOfferSchema,
} from "./create-confirmed-rental.contract";

export const CreateDraftRentalDeliveryDetailsSchema = z.discriminatedUnion(
  "arrangement",
  [
    DraftRentalRoutedDestinationSchema,
    DraftRentalStaffArrangedDestinationSchema,
  ],
);

export const CreateDraftRentalManualPricingAdjustmentSchema = z.object({
  mode: z.literal("TARGET_TOTAL"),
  targetTotal: PayableTargetTotalSchema,
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
    fulfillmentMethod: CreateConfirmedRentalFulfillmentMethodSchema,
    deliveryDetails: CreateDraftRentalDeliveryDetailsSchema.optional(),
    deliveryDecisions: CreateDraftRentalDeliveryDecisionsSchema.optional(),
    notes: z.string().optional(),
    insuranceSelected: z.boolean().optional(),
    manualPricingAdjustment:
      CreateDraftRentalManualPricingAdjustmentSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.deliveryDetails?.arrangement === "STAFF_ARRANGED") {
      if (value.fulfillmentMethod !== "DELIVERY") {
        context.addIssue({
          code: "custom",
          path: ["deliveryDetails"],
          message: "Staff-arranged destinations require delivery fulfillment.",
        });
      }
      validateNewStaffArrangedDeliveryDecisions(
        value.deliveryDecisions,
        context,
      );
    }
    if (
      value.fulfillmentMethod === "PICKUP" &&
      value.deliveryDecisions !== undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["deliveryDecisions"],
        message: "Pickup rentals cannot include delivery decisions.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    deliveryDetails:
      value.fulfillmentMethod === "DELIVERY"
        ? value.deliveryDetails
        : undefined,
  }));

export const CreateDraftRentalHeadersSchema = z.object({
  "idempotency-key": z.string().uuid(),
});

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
  headers: CreateDraftRentalHeadersSchema,
  body: CreateDraftRentalBodySchema,
  response: CreateDraftRentalResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  typeof CreateDraftRentalHeadersSchema,
  typeof CreateDraftRentalBodySchema,
  typeof CreateDraftRentalResponseSchema
>;
