import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { CreateBranchScheduleSlotTypeSchema } from "./create-branch.contract";

export const GetStorefrontBranchSchedulesParamsSchema = z.object({
  branchId: z.uuid(),
});

export const GetStorefrontBranchScheduleSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  type: CreateBranchScheduleSlotTypeSchema,
  dayOfWeek: z.number().int().min(0).max(6).nullable(),
  specificDate: z.string().date().nullable(),
  openTime: z.number().int().min(0).max(1439),
  closeTime: z.number().int().min(0).max(1439),
  slotIntervalMinutes: z.number().int().positive().nullable(),
});

export const GetStorefrontBranchSchedulesResponseSchema = z.array(
  GetStorefrontBranchScheduleSchema,
);

export type GetStorefrontBranchSchedulesParamsDto = z.infer<
  typeof GetStorefrontBranchSchedulesParamsSchema
>;
export type GetStorefrontBranchScheduleDto = z.infer<
  typeof GetStorefrontBranchScheduleSchema
>;
export type GetStorefrontBranchSchedulesResponseDto = z.infer<
  typeof GetStorefrontBranchSchedulesResponseSchema
>;

export const getStorefrontBranchSchedulesContract = {
  method: "GET",
  path: "/storefront/tenant-management/branches/:branchId/schedules",
  params: GetStorefrontBranchSchedulesParamsSchema,
  response: GetStorefrontBranchSchedulesResponseSchema,
} satisfies ApiContract<
  typeof GetStorefrontBranchSchedulesParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof GetStorefrontBranchSchedulesResponseSchema
>;
