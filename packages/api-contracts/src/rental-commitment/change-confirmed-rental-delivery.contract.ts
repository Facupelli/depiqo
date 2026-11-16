import { z } from "zod";
import type { ApiContract } from "../api-contract";
import { DraftRentalStaffArrangedDestinationSchema } from "./draft-rental-delivery-destination.schema";
import { UpdateDraftRentalDeliveryDecisionsSchema } from "./draft-rental-delivery-decisions.schema";

export const ChangeConfirmedRentalDeliveryParamsSchema = z.object({
  rentalId: z.string().trim().min(1),
});

// Supplying a destination explicitly selects its arrangement. Omission preserves it.
// No tenant, attribution, rental period, or accepted pricing facts are client inputs.
export const ChangeConfirmedRentalDeliveryBodySchema = z
  .strictObject({
    expectedVersion: z.number().int().nonnegative(),
    destination: z
      .discriminatedUnion("arrangement", [
        z.strictObject({
          arrangement: z.literal("ROUTED"),
          address: z.string().trim().min(1),
          locationId: z.string().trim().min(1),
        }),
        DraftRentalStaffArrangedDestinationSchema,
      ])
      .optional(),
    deliveryDecisions: UpdateDraftRentalDeliveryDecisionsSchema.optional(),
  })
  .refine(
    (body) =>
      body.destination !== undefined ||
      Object.values(body.deliveryDecisions ?? {}).some(
        (value) => value !== undefined,
      ),
    "Supply a destination or a delivery decision",
  );

export const ChangeConfirmedRentalDeliveryResponseSchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export type ChangeConfirmedRentalDeliveryParamsDto = z.infer<
  typeof ChangeConfirmedRentalDeliveryParamsSchema
>;
export type ChangeConfirmedRentalDeliveryBodyDto = z.infer<
  typeof ChangeConfirmedRentalDeliveryBodySchema
>;
export type ChangeConfirmedRentalDeliveryResponseDto = z.infer<
  typeof ChangeConfirmedRentalDeliveryResponseSchema
>;

export const changeConfirmedRentalDeliveryContract = {
  method: "PATCH",
  path: "/rental-commitments/confirmed-rentals/:rentalId/delivery",
  params: ChangeConfirmedRentalDeliveryParamsSchema,
  body: ChangeConfirmedRentalDeliveryBodySchema,
  response: ChangeConfirmedRentalDeliveryResponseSchema,
} satisfies ApiContract<
  typeof ChangeConfirmedRentalDeliveryParamsSchema,
  undefined,
  undefined,
  typeof ChangeConfirmedRentalDeliveryBodySchema,
  typeof ChangeConfirmedRentalDeliveryResponseSchema
>;
