import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { LocalDateSchema } from "../local-date.schema";

export const CreateBranchScheduleSlotTypeSchema = z.enum(["PICKUP", "RETURN"]);

export const CreateBranchScheduleBodySchema = z.object({
  type: CreateBranchScheduleSlotTypeSchema,
  dayOfWeek: z.number().int().min(0).max(6).nullable(),
  specificDate: LocalDateSchema.nullable(),
  openTime: z.number().int().min(0).max(1439),
  closeTime: z.number().int().min(0).max(1439),
  slotIntervalMinutes: z.number().int().positive().nullable(),
});

export const CreateBranchBodySchema = z.object({
  name: z.string().trim().min(1),
  address: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  supportsDelivery: z.boolean().optional(),
  deliveryDefaultCountry: z.string().nullable().optional(),
  deliveryDefaultStateRegion: z.string().nullable().optional(),
  deliveryDefaultCity: z.string().nullable().optional(),
  deliveryDefaultPostalCode: z.string().nullable().optional(),
  schedules: z.array(CreateBranchScheduleBodySchema).optional(),
});

export const CreateBranchResponseSchema = z.object({
  id: z.string(),
});

export type CreateBranchScheduleBodyDto = z.infer<
  typeof CreateBranchScheduleBodySchema
>;
export type CreateBranchBodyDto = z.infer<typeof CreateBranchBodySchema>;
export type CreateBranchResponseDto = z.infer<typeof CreateBranchResponseSchema>;

export const createBranchContract = {
  method: "POST",
  path: "/tenant-management/branches",
  body: CreateBranchBodySchema,
  response: CreateBranchResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof CreateBranchBodySchema,
  typeof CreateBranchResponseSchema
>;
