import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { InvoiceSchema, InvoiceVisibilityQuerySchema } from "./invoice.schema";

export const GetRentalInvoicesQuerySchema = InvoiceVisibilityQuerySchema.extend(
  {
    rentalId: z.string().trim().uuid(),
  },
);
export const GetRentalInvoicesResponseSchema = z.array(InvoiceSchema);

export type GetRentalInvoicesQueryDto = z.infer<
  typeof GetRentalInvoicesQuerySchema
>;
export type GetRentalInvoicesResponseDto = z.infer<
  typeof GetRentalInvoicesResponseSchema
>;

export const getRentalInvoicesContract = {
  method: "GET",
  path: "/invoicing/invoices",
  query: GetRentalInvoicesQuerySchema,
  response: GetRentalInvoicesResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof GetRentalInvoicesQuerySchema,
  undefined,
  undefined,
  typeof GetRentalInvoicesResponseSchema
>;
