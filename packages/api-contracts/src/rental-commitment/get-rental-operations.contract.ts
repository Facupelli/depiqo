import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { LocalDateSchema } from "../local-date.schema";
import { GetRentalsFulfillmentMethodSchema } from "./get-rentals.contract";

export const GetRentalOperationsQuerySchema = z
  .object({
    branchId: z.string().trim().min(1),
    from: LocalDateSchema,
    to: LocalDateSchema,
  })
  .refine(({ from, to }) => from <= to, {
    message: "from must be before or equal to to",
    path: ["to"],
  });

export const RentalOperationCustomerSchema = z.object({
  id: z.string(),
  displayName: z.string(),
});

export const RentalOperationSummarySchema = z.object({
  id: z.string(),
  rentalNumber: z.number().int().positive(),
  customer: RentalOperationCustomerSchema.nullable(),
  fulfillmentMethod: GetRentalsFulfillmentMethodSchema,
  scheduledAt: z.iso.datetime(),
  equipmentCount: z.number().int().nonnegative(),
});

export const GetRentalOperationsResponseSchema = z.object({
  goingOut: z.array(RentalOperationSummarySchema),
  comingBack: z.array(RentalOperationSummarySchema),
});

export type GetRentalOperationsQueryDto = z.infer<typeof GetRentalOperationsQuerySchema>;
export type RentalOperationCustomerDto = z.infer<typeof RentalOperationCustomerSchema>;
export type RentalOperationSummaryDto = z.infer<typeof RentalOperationSummarySchema>;
export type GetRentalOperationsResponseDto = z.infer<typeof GetRentalOperationsResponseSchema>;

export const getRentalOperationsContract = {
  method: "GET",
  path: "/rental-commitments/rentals/operations",
  query: GetRentalOperationsQuerySchema,
  response: GetRentalOperationsResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof GetRentalOperationsQuerySchema,
  undefined,
  undefined,
  typeof GetRentalOperationsResponseSchema
>;
