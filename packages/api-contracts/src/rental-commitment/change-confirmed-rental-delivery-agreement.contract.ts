import { z } from "zod";
import type { ApiContract } from "../api-contract";

export const DeliveryAgreementAmountSchema = z
  .string()
  .trim()
  .regex(
    /^\d+(?:\.\d{1,2}0*)?$/,
    "Enter a non-negative amount exactly representable in cents",
  );

export const ChangeConfirmedRentalDeliveryAgreementParamsSchema = z.object({
  rentalId: z.string().trim().min(1),
});

export const ChangeConfirmedRentalDeliveryAgreementBodySchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  agreement: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("SET"),
      amount: DeliveryAgreementAmountSchema,
      reason: z.string().trim().optional(),
    }),
    z.object({ type: z.literal("CLEAR") }),
  ]),
});

export const ChangeConfirmedRentalDeliveryAgreementResponseSchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export type ChangeConfirmedRentalDeliveryAgreementParamsDto = z.infer<
  typeof ChangeConfirmedRentalDeliveryAgreementParamsSchema
>;
export type ChangeConfirmedRentalDeliveryAgreementBodyDto = z.infer<
  typeof ChangeConfirmedRentalDeliveryAgreementBodySchema
>;
export type ChangeConfirmedRentalDeliveryAgreementResponseDto = z.infer<
  typeof ChangeConfirmedRentalDeliveryAgreementResponseSchema
>;

export const changeConfirmedRentalDeliveryAgreementContract = {
  method: "PATCH",
  path: "/rental-commitments/confirmed-rentals/:rentalId/delivery-agreement",
  params: ChangeConfirmedRentalDeliveryAgreementParamsSchema,
  body: ChangeConfirmedRentalDeliveryAgreementBodySchema,
  response: ChangeConfirmedRentalDeliveryAgreementResponseSchema,
} satisfies ApiContract<
  typeof ChangeConfirmedRentalDeliveryAgreementParamsSchema,
  undefined,
  undefined,
  typeof ChangeConfirmedRentalDeliveryAgreementBodySchema,
  typeof ChangeConfirmedRentalDeliveryAgreementResponseSchema
>;
