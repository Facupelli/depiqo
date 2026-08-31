import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { LocalDateSchema } from "../local-date.schema";

export const GetStorefrontBranchScheduleSlotsParamsSchema = z.object({
  branchId: z.uuid(),
});

export const GetStorefrontBranchScheduleSlotsQuerySchema = z
  .object({
    periodStart: LocalDateSchema.optional(),
    periodEnd: LocalDateSchema.optional(),
  })
  .refine((query) => query.periodStart !== undefined || query.periodEnd !== undefined, {
    message: "At least one of periodStart or periodEnd is required.",
  })
  .refine(
    (query) => {
      if (query.periodStart === undefined || query.periodEnd === undefined) {
        return true;
      }

      return query.periodEnd >= query.periodStart;
    },
    {
      message: "periodEnd must not be before periodStart.",
      path: ["periodEnd"],
    },
  );

export const BranchScheduleSlotSchema = z.object({
  minuteOfDay: z.number().int().min(0).max(1439),
  instant: z.iso.datetime({ offset: true }),
});

export const GetStorefrontBranchScheduleSlotsResponseSchema = z.object({
  pickupSlots: z.array(BranchScheduleSlotSchema).optional(),
  returnSlots: z.array(BranchScheduleSlotSchema).optional(),
});

export type GetStorefrontBranchScheduleSlotsParamsDto = z.infer<
  typeof GetStorefrontBranchScheduleSlotsParamsSchema
>;
export type GetStorefrontBranchScheduleSlotsQueryDto = z.infer<
  typeof GetStorefrontBranchScheduleSlotsQuerySchema
>;
export type BranchScheduleSlotDto = z.infer<typeof BranchScheduleSlotSchema>;

export type GetStorefrontBranchScheduleSlotsResponseDto = z.infer<
  typeof GetStorefrontBranchScheduleSlotsResponseSchema
>;

export const getStorefrontBranchScheduleSlotsContract = {
  method: "GET",
  path: "/storefront/tenant-management/branches/:branchId/schedule-slots",
  params: GetStorefrontBranchScheduleSlotsParamsSchema,
  query: GetStorefrontBranchScheduleSlotsQuerySchema,
  response: GetStorefrontBranchScheduleSlotsResponseSchema,
} satisfies ApiContract<
  typeof GetStorefrontBranchScheduleSlotsParamsSchema,
  typeof GetStorefrontBranchScheduleSlotsQuerySchema,
  undefined,
  undefined,
  typeof GetStorefrontBranchScheduleSlotsResponseSchema
>;
