import { z } from "zod";

import type { ApiContract } from "../api-contract";
import {
  InvoiceHistoryEntrySchema,
  InvoiceParamsSchema,
  InvoiceSchema,
  InvoiceVisibilityQuerySchema,
} from "./invoice.schema";

export const GetInvoiceParamsSchema = InvoiceParamsSchema;
export const GetInvoiceQuerySchema = InvoiceVisibilityQuerySchema;
export const GetInvoiceResponseSchema = InvoiceSchema.extend({
  history: z.array(InvoiceHistoryEntrySchema),
});

export type GetInvoiceParamsDto = z.infer<typeof GetInvoiceParamsSchema>;
export type GetInvoiceQueryDto = z.infer<typeof GetInvoiceQuerySchema>;
export type GetInvoiceResponseDto = z.infer<typeof GetInvoiceResponseSchema>;

export const getInvoiceContract = {
  method: "GET",
  path: "/invoicing/invoices/:invoiceId",
  params: GetInvoiceParamsSchema,
  query: GetInvoiceQuerySchema,
  response: GetInvoiceResponseSchema,
} satisfies ApiContract<
  typeof GetInvoiceParamsSchema,
  typeof GetInvoiceQuerySchema,
  undefined,
  undefined,
  typeof GetInvoiceResponseSchema
>;
