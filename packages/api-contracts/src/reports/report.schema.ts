import { z } from "zod";

import { LocalDateSchema } from "../local-date.schema";

export const ReportRentalStatusSchema = z.enum([
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
]);

const ReportStatusesQuerySchema = z
  .union([
    z.array(ReportRentalStatusSchema).min(1),
    z
      .string()
      .transform((value) => value.split(",").map((status) => status.trim()))
      .pipe(z.array(ReportRentalStatusSchema).min(1)),
  ])
  .transform((statuses) => [...new Set(statuses)])
  .default(["CONFIRMED", "COMPLETED"]);

export const ReportQuerySchema = z.strictObject({
  year: z.coerce.number().int().min(1).max(9998),
  month: z.coerce.number().int().min(1).max(12).optional(),
  branchId: z.string().trim().min(1).optional(),
  statuses: ReportStatusesQuerySchema,
  page: z.coerce.number().int().positive().max(2_147_483_647).default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const ReportPeriodSchema = z.object({
  timezone: z.string().min(1),
  from: LocalDateSchema,
  until: LocalDateSchema,
});

export const ReportCountSchema = z.number().int().nonnegative();
export const ReportCurrencySchema = z.string().regex(/^[A-Z]{3}$/);
export const ReportAmountSchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,14})(\.\d{1,4})?$/);

export type ReportRentalStatusDto = z.infer<typeof ReportRentalStatusSchema>;
export type ReportQueryDto = z.infer<typeof ReportQuerySchema>;
export type ReportPeriodDto = z.infer<typeof ReportPeriodSchema>;
