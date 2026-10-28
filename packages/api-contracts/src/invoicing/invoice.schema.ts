import { z } from "zod";

import { LocalDateSchema } from "../local-date.schema";

// NUMERIC(19,4): up to 15 integer digits (ignoring leading zeroes) and
// four fractional digits. Keep strings exact, without coercion or rounding.
export const InvoiceAmountSchema = z
  .string()
  .trim()
  .max(64)
  .regex(
    /^0*\d{1,15}(?:\.\d{1,4})?$/,
    "Enter an amount within NUMERIC(19,4) precision",
  )
  .refine((value) => /[1-9]/.test(value), "Amount must be greater than zero");

export const InvoiceVersionSchema = z.int32().nonnegative();
export const InvoiceReferenceSchema = z.string().trim().min(1).max(255);
export const InvoiceSourceSystemSchema = z
  .string()
  .trim()
  .max(100)
  .transform((value) => value || null)
  .nullable();

export const InvoiceExternalUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (value === "") return true;
    try {
      const url = new URL(value);
      return (
        (url.protocol === "http:" || url.protocol === "https:") &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Enter an absolute HTTP(S) URL without credentials")
  .transform((value) => value || null)
  .nullable();

export const InvoiceParamsSchema = z.object({
  invoiceId: z.string().trim().uuid(),
});

export const InvoiceVisibilityQuerySchema = z.object({
  includeRemoved: z
    .union([
      z.boolean(),
      z.stringbool({
        truthy: ["true"],
        falsy: ["false"],
        case: "sensitive",
      }),
    ])
    .default(false),
});

export const InvoiceRegistrationFieldsSchema = z.strictObject({
  reference: InvoiceReferenceSchema,
  issuedOn: LocalDateSchema,
  amount: InvoiceAmountSchema,
  externalUrl: InvoiceExternalUrlSchema.optional(),
  sourceSystem: InvoiceSourceSystemSchema.optional(),
});

export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  rentalId: z.string().uuid(),
  origin: z.literal("EXTERNAL"),
  reference: InvoiceReferenceSchema,
  issuedOn: LocalDateSchema,
  amount: InvoiceAmountSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  externalUrl: InvoiceExternalUrlSchema,
  sourceSystem: InvoiceSourceSystemSchema,
  createdAt: z.string().datetime(),
  createdByTenantUserId: z.string().min(1),
  updatedAt: z.string().datetime(),
  updatedByTenantUserId: z.string().min(1),
  removedAt: z.string().datetime().nullable(),
  removedByTenantUserId: z.string().min(1).nullable(),
  version: InvoiceVersionSchema,
});

export const InvoiceHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  version: InvoiceVersionSchema,
  action: z.enum(["REGISTERED", "CORRECTED", "REMOVED"]),
  actorTenantUserId: z.string().min(1),
  occurredAt: z.string().datetime(),
  snapshot: InvoiceSchema,
});

export type InvoiceDto = z.infer<typeof InvoiceSchema>;
export type InvoiceHistoryEntryDto = z.infer<typeof InvoiceHistoryEntrySchema>;
