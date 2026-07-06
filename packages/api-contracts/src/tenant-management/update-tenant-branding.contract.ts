import { z } from "zod";

import type { ApiContract } from "../api-contract";

const NullableTrimmedStringSchema = z.string().trim().min(1).nullable();

export const UpdateTenantBrandingBodySchema = z.object({
  logoUrl: NullableTrimmedStringSchema,
  faviconUrl: NullableTrimmedStringSchema,
  primaryColor: NullableTrimmedStringSchema,
  accentColor: NullableTrimmedStringSchema,
  storefrontName: NullableTrimmedStringSchema,
  tagline: NullableTrimmedStringSchema,
});

export const UpdateTenantBrandingResponseSchema = z.object({
  id: z.string(),
});

export type UpdateTenantBrandingBodyDto = z.infer<
  typeof UpdateTenantBrandingBodySchema
>;
export type UpdateTenantBrandingResponseDto = z.infer<
  typeof UpdateTenantBrandingResponseSchema
>;

export const updateTenantBrandingContract = {
  method: "PUT",
  path: "/tenant-management/tenant/branding",
  body: UpdateTenantBrandingBodySchema,
  response: UpdateTenantBrandingResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof UpdateTenantBrandingBodySchema,
  typeof UpdateTenantBrandingResponseSchema
>;
