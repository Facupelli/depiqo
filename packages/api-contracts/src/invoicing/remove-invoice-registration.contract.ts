import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { InvoiceParamsSchema, InvoiceVersionSchema } from "./invoice.schema";

export const RemoveInvoiceRegistrationParamsSchema = InvoiceParamsSchema;
export const RemoveInvoiceRegistrationQuerySchema = z.object({
  expectedVersion: z
    .union([z.string().regex(/^\d+$/).transform(Number), z.number()])
    .pipe(InvoiceVersionSchema),
});
export const RemoveInvoiceRegistrationResponseSchema = z.void();

export type RemoveInvoiceRegistrationParamsDto = z.infer<
  typeof RemoveInvoiceRegistrationParamsSchema
>;
export type RemoveInvoiceRegistrationQueryDto = z.infer<
  typeof RemoveInvoiceRegistrationQuerySchema
>;
export type RemoveInvoiceRegistrationResponseDto = z.infer<
  typeof RemoveInvoiceRegistrationResponseSchema
>;

export const removeInvoiceRegistrationContract = {
  method: "DELETE",
  path: "/invoicing/invoices/:invoiceId",
  params: RemoveInvoiceRegistrationParamsSchema,
  query: RemoveInvoiceRegistrationQuerySchema,
  response: RemoveInvoiceRegistrationResponseSchema,
} satisfies ApiContract<
  typeof RemoveInvoiceRegistrationParamsSchema,
  typeof RemoveInvoiceRegistrationQuerySchema,
  undefined,
  undefined,
  typeof RemoveInvoiceRegistrationResponseSchema
>;
