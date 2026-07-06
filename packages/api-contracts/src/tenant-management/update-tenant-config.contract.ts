import { z } from "zod";

import type { ApiContract } from "../api-contract";
import {
  TenantBookingModeSchema,
  TenantCommunicationConfigSchema,
  TenantNotificationsConfigSchema,
  TenantPricingConfigSchema,
} from "./get-current-tenant.contract";

export const UpdateTenantConfigBodySchema = z
  .object({
    pricing: TenantPricingConfigSchema.partial().optional(),
    notifications: TenantNotificationsConfigSchema.partial().optional(),
    communication: TenantCommunicationConfigSchema.partial().optional(),
    timezone: z.string().optional(),
    newArrivalsWindowDays: z.number().int().positive().optional(),
    bookingMode: TenantBookingModeSchema.optional(),
  })
  .strict();

export const UpdateTenantConfigResponseSchema = z.object({
  id: z.string(),
});

export type UpdateTenantConfigBodyDto = z.infer<
  typeof UpdateTenantConfigBodySchema
>;
export type UpdateTenantConfigResponseDto = z.infer<
  typeof UpdateTenantConfigResponseSchema
>;

export const updateTenantConfigContract = {
  method: "PATCH",
  path: "/tenant-management/tenant/config",
  body: UpdateTenantConfigBodySchema,
  response: UpdateTenantConfigResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof UpdateTenantConfigBodySchema,
  typeof UpdateTenantConfigResponseSchema
>;
