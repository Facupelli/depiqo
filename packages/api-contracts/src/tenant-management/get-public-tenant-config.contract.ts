import { z } from "zod";

import type { ApiContract } from "../api-contract";
import {
  TenantBookingModeSchema,
  TenantInsuranceDescriptionSchema,
  TenantInsuranceLabelSchema,
  TenantOrderCommunicationModeSchema,
} from "./get-current-tenant.contract";

export const GetPublicTenantConfigResponseSchema = z.object({
  insuranceEnabled: z.boolean(),
  insuranceLabel: TenantInsuranceLabelSchema,
  insuranceDescription: TenantInsuranceDescriptionSchema,
  bookingMode: TenantBookingModeSchema,
  communicationMode: TenantOrderCommunicationModeSchema,
  currency: z.string(),
  locale: z.string(),
  whatsAppNumber: z.string().optional(),
  showFloatingWhatsAppButton: z.boolean(),
  newArrivalsWindowDays: z.number().int().positive(),
});

export type GetPublicTenantConfigResponseDto = z.infer<
  typeof GetPublicTenantConfigResponseSchema
>;

export const getPublicTenantConfigContract = {
  method: "GET",
  path: "/storefront/tenant-management/tenant/config",
  response: GetPublicTenantConfigResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  undefined,
  typeof GetPublicTenantConfigResponseSchema
>;
