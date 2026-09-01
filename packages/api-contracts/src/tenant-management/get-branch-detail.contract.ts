import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { BranchOperationalLocationSchema } from "./branch-operational-location.schema";
import { CreateBranchScheduleSlotTypeSchema } from "./create-branch.contract";
import { LocalDateSchema } from "../local-date.schema";

export const GetBranchDetailParamsSchema = z.object({
  branchId: z.string(),
});

export const GetBranchDetailScheduleSchema = z.object({
  id: z.string(),
  type: CreateBranchScheduleSlotTypeSchema,
  dayOfWeek: z.number().int().min(0).max(6).nullable(),
  specificDate: LocalDateSchema.nullable(),
  openTime: z.number().int().min(0).max(1439),
  closeTime: z.number().int().min(0).max(1439),
  slotIntervalMinutes: z.number().int().positive().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const GetBranchDetailResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  operationalLocation: BranchOperationalLocationSchema.nullable(),
  timezone: z.string().nullable(),
  isActive: z.boolean(),
  schedules: z.array(GetBranchDetailScheduleSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type GetBranchDetailParamsDto = z.infer<typeof GetBranchDetailParamsSchema>;
export type GetBranchDetailScheduleDto = z.infer<typeof GetBranchDetailScheduleSchema>;
export type GetBranchDetailResponseDto = z.infer<typeof GetBranchDetailResponseSchema>;

export const getBranchDetailContract = {
  method: "GET",
  path: "/tenant-management/branches/:branchId",
  params: GetBranchDetailParamsSchema,
  response: GetBranchDetailResponseSchema,
} satisfies ApiContract<
  typeof GetBranchDetailParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof GetBranchDetailResponseSchema
>;
