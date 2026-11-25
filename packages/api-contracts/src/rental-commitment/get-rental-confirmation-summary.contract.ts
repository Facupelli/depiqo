import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ConfirmRentalParamsSchema } from "./confirm-rental.contract";
import {
  AcceptedDeliverySchema,
  RentalDeliveryDetailsSchema,
} from "./delivery-representation.schema";

export const GetRentalConfirmationSummaryResponseSchema = z.object({
  rentalVersion: z.number().int().nonnegative(),
  equipmentAmount: z.string(),
  insuranceAmount: z.string(),
  deliveryCharge: z.string().nullable(),
  delivery: AcceptedDeliverySchema.nullable(),
  deliveryDetails: RentalDeliveryDetailsSchema.nullable(),
  deliverySource: z.enum(["STORED", "REVALIDATED"]).nullable(),
  deliveryReviewRequired: z.boolean(),
  customerTotal: z.string(),
  currency: z.string(),
});

export type GetRentalConfirmationSummaryResponseDto = z.infer<
  typeof GetRentalConfirmationSummaryResponseSchema
>;

export const getRentalConfirmationSummaryContract = {
  method: "GET",
  path: "/rental-commitments/rentals/:rentalId/confirmation-summary",
  params: ConfirmRentalParamsSchema,
  response: GetRentalConfirmationSummaryResponseSchema,
} satisfies ApiContract<
  typeof ConfirmRentalParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof GetRentalConfirmationSummaryResponseSchema
>;
