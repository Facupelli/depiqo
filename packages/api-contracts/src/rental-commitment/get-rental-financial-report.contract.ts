import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { LocalDateSchema } from "../local-date.schema";

// The exclusive end of the selected year must also fit a four-digit local date.
export const RentalFinancialReportYearSchema = z.number().int().min(1).max(9998);

export const GetRentalFinancialReportQuerySchema = z.object({
  year: z.coerce.number().pipe(RentalFinancialReportYearSchema),
});

export const RentalFinancialReportAmountSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)(\.\d+)?$/);

export const RentalFinancialReportOwnerSchema = z.object({
  ownerId: z.string().min(1),
  ownerName: z.string().nullable(),
  amount: RentalFinancialReportAmountSchema,
});

export const RentalFinancialReportTotalsSchema = z.object({
  rentalCount: z.number().int().nonnegative(),
  equipmentAmount: RentalFinancialReportAmountSchema,
  insuranceAmount: RentalFinancialReportAmountSchema,
  deliveryAmount: RentalFinancialReportAmountSchema,
  thirdPartyAmount: RentalFinancialReportAmountSchema,
  owners: z.array(RentalFinancialReportOwnerSchema),
});

export const RentalFinancialReportPeriodSchema =
  RentalFinancialReportTotalsSchema.extend({
    from: LocalDateSchema,
    until: LocalDateSchema,
  });

/**
 * Current accepted CONFIRMED/COMPLETED rental values, attributed wholly to their
 * tenant-local start month, including future starts within the selected year.
 * Periods are January through December; `until` is exclusive. Annual totals and
 * owner amounts reconcile with the twelve periods. Owner names are current.
 *
 * Components are independent: insurance/delivery inclusion is a presentation
 * choice and never changes contractual third-party amounts. These are not
 * collected payments, accounting revenue recognition, profit, or payout balances.
 */
export const GetRentalFinancialReportResponseSchema = z.object({
  year: RentalFinancialReportYearSchema,
  timezone: z.string().min(1),
  currency: z.string().regex(/^[A-Z]{3}$/),
  totals: RentalFinancialReportTotalsSchema,
  periods: z.array(RentalFinancialReportPeriodSchema).length(12),
});

export type GetRentalFinancialReportQueryDto = z.infer<
  typeof GetRentalFinancialReportQuerySchema
>;
export type RentalFinancialReportOwnerDto = z.infer<
  typeof RentalFinancialReportOwnerSchema
>;
export type RentalFinancialReportTotalsDto = z.infer<
  typeof RentalFinancialReportTotalsSchema
>;
export type RentalFinancialReportPeriodDto = z.infer<
  typeof RentalFinancialReportPeriodSchema
>;
export type GetRentalFinancialReportResponseDto = z.infer<
  typeof GetRentalFinancialReportResponseSchema
>;

export const getRentalFinancialReportContract = {
  method: "GET",
  path: "/rental-commitments/financial-report",
  query: GetRentalFinancialReportQuerySchema,
  response: GetRentalFinancialReportResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof GetRentalFinancialReportQuerySchema,
  undefined,
  undefined,
  typeof GetRentalFinancialReportResponseSchema
>;
