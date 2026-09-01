import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ExplicitOffsetInstantWireSchema } from "../explicit-offset-instant.schema";

export const CreateConfirmedRentalSelectedOfferSchema = z.object({
  rentalOfferId: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive(),
});

export const CreateConfirmedRentalFulfillmentMethodSchema = z.enum([
  "PICKUP",
  "DELIVERY",
]);

export const CreateConfirmedRentalDeliveryDetailsSchema = z.object({
  addressLine1: z.string().trim().min(1),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(1),
  state: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().optional(),
  contactName: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const CreateConfirmedRentalBodySchema = z
  .object({
    branchId: z.string().trim().min(1),
    period: z.object({
      start: ExplicitOffsetInstantWireSchema,
      end: ExplicitOffsetInstantWireSchema,
    }),
    selectedOffers: z
      .array(CreateConfirmedRentalSelectedOfferSchema)
      .default([]),
    fulfillmentMethod: CreateConfirmedRentalFulfillmentMethodSchema,
    deliveryDetails: CreateConfirmedRentalDeliveryDetailsSchema.optional(),
    notes: z.string().optional(),
    insuranceSelected: z.boolean().optional(),
  })
  .transform((value) => ({
    ...value,
    deliveryDetails:
      value.fulfillmentMethod === "DELIVERY"
        ? value.deliveryDetails
        : undefined,
  }));

export const CreateConfirmedRentalHeadersSchema = z.object({
  "idempotency-key": z.string().uuid(),
});

export const CreateConfirmedRentalResponseSchema = z.object({
  rentalNumber: z.number().int().positive(),
});

export type CreateConfirmedRentalSelectedOfferDto = z.infer<
  typeof CreateConfirmedRentalSelectedOfferSchema
>;
export type CreateConfirmedRentalFulfillmentMethodDto = z.infer<
  typeof CreateConfirmedRentalFulfillmentMethodSchema
>;
export type CreateConfirmedRentalDeliveryDetailsDto = z.infer<
  typeof CreateConfirmedRentalDeliveryDetailsSchema
>;
export type CreateConfirmedRentalBodyDto = z.input<
  typeof CreateConfirmedRentalBodySchema
>;
export type CreateConfirmedRentalResponseDto = z.infer<
  typeof CreateConfirmedRentalResponseSchema
>;

export const createConfirmedRentalContract = {
  method: "POST",
  path: "/rental-commitments/confirmed-rentals",
  headers: CreateConfirmedRentalHeadersSchema,
  body: CreateConfirmedRentalBodySchema,
  response: CreateConfirmedRentalResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  typeof CreateConfirmedRentalHeadersSchema,
  typeof CreateConfirmedRentalBodySchema,
  typeof CreateConfirmedRentalResponseSchema
>;
