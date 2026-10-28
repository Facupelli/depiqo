import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { LocalDateSchema } from "../local-date.schema";
import {
  ReportAmountSchema,
  ReportCountSchema,
  ReportCurrencySchema,
  ReportPeriodSchema,
  ReportQuerySchema,
  ReportRentalStatusSchema,
} from "./report.schema";

export const ReportInvoicePresenceSchema = z.enum([
  "ALL",
  "WITH_INVOICE",
  "WITHOUT_INVOICE",
]);

export const GetRentalOrdersReportQuerySchema = ReportQuerySchema.extend({
  invoicePresence: ReportInvoicePresenceSchema.default("ALL"),
});

export const RentalOrdersReportInvoiceSchema = z.object({
  id: z.string().min(1),
  reference: z.string().min(1),
  issuedOn: LocalDateSchema,
  amount: ReportAmountSchema,
  currency: ReportCurrencySchema,
});

const RentalOrdersReportReferenceSchema = z.object({
  id: z.string().min(1),
  name: z.string().nullable(),
});

export const RentalOrdersReportItemSchema = z.object({
  id: z.string().min(1),
  rentalNumber: z.number().int().positive(),
  customer: RentalOrdersReportReferenceSchema.nullable(),
  branch: RentalOrdersReportReferenceSchema,
  period: z.object({
    start: z.iso.datetime(),
    end: z.iso.datetime(),
  }),
  createdAt: z.iso.datetime(),
  confirmedAt: z.iso.datetime().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  status: ReportRentalStatusSchema,
  currency: ReportCurrencySchema.nullable(),
  acceptedCustomerTotal: ReportAmountSchema.nullable(),
  hasInvoice: z.boolean(),
  invoices: z.array(RentalOrdersReportInvoiceSchema),
});

export const GetRentalOrdersReportResponseSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12).nullable(),
  period: ReportPeriodSchema,
  data: z.array(RentalOrdersReportItemSchema),
  total: ReportCountSchema,
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  summary: z.object({
    rentalCount: ReportCountSchema,
    withInvoiceCount: ReportCountSchema,
    withoutInvoiceCount: ReportCountSchema,
  }),
});

export type ReportInvoicePresenceDto = z.infer<
  typeof ReportInvoicePresenceSchema
>;
export type GetRentalOrdersReportQueryDto = z.infer<
  typeof GetRentalOrdersReportQuerySchema
>;
export type RentalOrdersReportInvoiceDto = z.infer<
  typeof RentalOrdersReportInvoiceSchema
>;
export type RentalOrdersReportItemDto = z.infer<
  typeof RentalOrdersReportItemSchema
>;
export type GetRentalOrdersReportResponseDto = z.infer<
  typeof GetRentalOrdersReportResponseSchema
>;

export const getRentalOrdersReportContract = {
  method: "GET",
  path: "/reports/rentals",
  query: GetRentalOrdersReportQuerySchema,
  response: GetRentalOrdersReportResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof GetRentalOrdersReportQuerySchema,
  undefined,
  undefined,
  typeof GetRentalOrdersReportResponseSchema
>;
