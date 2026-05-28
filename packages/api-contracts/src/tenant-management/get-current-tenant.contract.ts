import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const TenantRoundingRuleSchema = z.enum([
  "IGNORE_PARTIAL_DAY",
  "BILL_OVER_HALF_DAY",
  "BILL_ANY_PARTIAL_DAY",
]);

export const TenantBookingModeSchema = z.enum(["instant-book", "request-to-book"]);

export const TenantOrderCommunicationModeSchema = z.enum(["FORMAL", "WHATSAPP"]);

export const TenantNotificationChannelSchema = z.enum(["EMAIL"]);

export const TenantPricingConfigSchema = z.object({
  overRentalEnabled: z.boolean(),
  maxOverRentThreshold: z.number(),
  weekendCountsAsOne: z.boolean(),
  roundingRule: TenantRoundingRuleSchema,
  currency: z.string(),
  locale: z.string(),
  insuranceEnabled: z.boolean(),
  insuranceRatePercent: z.number().min(0).max(100),
});

export const TenantNotificationsConfigSchema = z.object({
  enabledChannels: z.array(TenantNotificationChannelSchema),
});

export const TenantCommunicationConfigSchema = z.object({
  orderCommunicationMode: TenantOrderCommunicationModeSchema,
  whatsAppNumber: z.string().optional(),
  showFloatingWhatsAppButton: z.boolean(),
});

export const TenantConfigSchema = z.object({
  pricing: TenantPricingConfigSchema,
  notifications: TenantNotificationsConfigSchema,
  communication: TenantCommunicationConfigSchema,
  timezone: z.string(),
  newArrivalsWindowDays: z.number().int().positive(),
  bookingMode: TenantBookingModeSchema,
});

export const TenantBrandingSchema = z.object({
  logoUrl: z.string().nullable(),
  faviconUrl: z.string().nullable(),
  primaryColor: z.string().nullable(),
  accentColor: z.string().nullable(),
  storefrontName: z.string().nullable(),
  tagline: z.string().nullable(),
});

export const GetCurrentTenantResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  config: TenantConfigSchema,
  branding: TenantBrandingSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TenantConfigDto = z.infer<typeof TenantConfigSchema>;
export type TenantBrandingDto = z.infer<typeof TenantBrandingSchema>;
export type GetCurrentTenantResponseDto = z.infer<typeof GetCurrentTenantResponseSchema>;

export const getCurrentTenantContract = {
  method: "GET",
  path: "/v2/tenant-management/tenant/me",
  response: GetCurrentTenantResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, undefined, typeof GetCurrentTenantResponseSchema>;
