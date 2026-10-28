import { z } from "zod";

import type { ApiContract } from "../api-contract";
import {
  InvoiceParamsSchema,
  InvoiceRegistrationFieldsSchema,
  InvoiceVersionSchema,
} from "./invoice.schema";

export const CorrectInvoiceRegistrationParamsSchema = InvoiceParamsSchema;
export const CorrectInvoiceRegistrationBodySchema =
  InvoiceRegistrationFieldsSchema.partial()
    .extend({ expectedVersion: InvoiceVersionSchema })
    .refine(
      (body) =>
        Object.entries(body).some(
          ([key, value]) => key !== "expectedVersion" && value !== undefined,
        ),
      { message: "At least one registration field must be provided." },
    );

export const CorrectInvoiceRegistrationResponseSchema = z.object({
  id: z.string().uuid(),
  version: InvoiceVersionSchema,
  updatedAt: z.string().datetime(),
});

export type CorrectInvoiceRegistrationParamsDto = z.infer<
  typeof CorrectInvoiceRegistrationParamsSchema
>;
export type CorrectInvoiceRegistrationBodyDto = z.infer<
  typeof CorrectInvoiceRegistrationBodySchema
>;
export type CorrectInvoiceRegistrationResponseDto = z.infer<
  typeof CorrectInvoiceRegistrationResponseSchema
>;

export const correctInvoiceRegistrationContract = {
  method: "PATCH",
  path: "/invoicing/invoices/:invoiceId",
  params: CorrectInvoiceRegistrationParamsSchema,
  body: CorrectInvoiceRegistrationBodySchema,
  response: CorrectInvoiceRegistrationResponseSchema,
} satisfies ApiContract<
  typeof CorrectInvoiceRegistrationParamsSchema,
  undefined,
  undefined,
  typeof CorrectInvoiceRegistrationBodySchema,
  typeof CorrectInvoiceRegistrationResponseSchema
>;
