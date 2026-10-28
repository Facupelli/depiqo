import { z } from "zod";

import type { ApiContract } from "../api-contract";
import {
  InvoiceRegistrationFieldsSchema,
  InvoiceVersionSchema,
} from "./invoice.schema";

export const RegisterExternalInvoiceBodySchema =
  InvoiceRegistrationFieldsSchema.extend({
    rentalId: z.string().trim().uuid(),
  });

export const RegisterExternalInvoiceResponseSchema = z.object({
  id: z.string().uuid(),
  version: InvoiceVersionSchema,
});

export type RegisterExternalInvoiceBodyDto = z.infer<
  typeof RegisterExternalInvoiceBodySchema
>;
export type RegisterExternalInvoiceResponseDto = z.infer<
  typeof RegisterExternalInvoiceResponseSchema
>;

export const registerExternalInvoiceContract = {
  method: "POST",
  path: "/invoicing/invoices",
  body: RegisterExternalInvoiceBodySchema,
  response: RegisterExternalInvoiceResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof RegisterExternalInvoiceBodySchema,
  typeof RegisterExternalInvoiceResponseSchema
>;
