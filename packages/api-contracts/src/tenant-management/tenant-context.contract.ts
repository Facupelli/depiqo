import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const StorefrontTenantScopeSchema = z.literal("public-storefront");

export const STOREFRONT_TENANT_CONTEXT_HEADER_NAME =
  "x-storefront-tenant-context";

export const PublicStorefrontTenantContextSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  customDomain: z.string().nullable(),
  logoUrl: z.string().nullable(),
  faviconUrl: z.string().nullable(),
  primaryColor: z.string().nullable(),
});

export type PublicStorefrontTenantContext = z.infer<
  typeof PublicStorefrontTenantContextSchema
>;

export const PublicTenantContextSchema = z.discriminatedUnion("face", [
  z.object({ face: z.literal("platform") }),
  z.object({ face: z.literal("admin") }),
  z.object({
    face: z.literal("storefront"),
    tenant: PublicStorefrontTenantContextSchema,
  }),
]);

export type PublicTenantContext = z.infer<typeof PublicTenantContextSchema>;

export const TrustedTenantContextSchema = z.discriminatedUnion("face", [
  z.object({
    face: z.literal("platform"),
    host: z.string().min(1),
  }),
  z.object({
    face: z.literal("admin"),
    host: z.string().min(1),
  }),
  z.object({
    face: z.literal("storefront"),
    host: z.string().min(1),
    canonicalHost: z.string().min(1),
    tenantId: z.string().min(1),
    slug: z.string().min(1),
    scope: StorefrontTenantScopeSchema,
    publicTenant: PublicStorefrontTenantContextSchema,
  }),
]);

export type TrustedTenantContext = z.infer<typeof TrustedTenantContextSchema>;

export const StorefrontTenantTokenPayloadSchema = z.object({
  iss: z.string().min(1),
  aud: z.string().min(1),
  scope: StorefrontTenantScopeSchema,
  tenant_id: z.string().min(1),
  host: z.string().min(1),
  canonical_host: z.string().min(1),
  iat: z.number().int(),
  exp: z.number().int(),
});

export type StorefrontTenantTokenPayload = z.infer<
  typeof StorefrontTenantTokenPayloadSchema
>;

export const ResolveTenantContextQuerySchema = z.object({
  hostname: z.string().min(1),
});

export type ResolveTenantContextQueryDto = z.infer<
  typeof ResolveTenantContextQuerySchema
>;

export const resolveInternalTenantContextContract = {
  method: "GET",
  path: "/internal/tenant-context/resolve",
  query: ResolveTenantContextQuerySchema,
  response: TrustedTenantContextSchema,
} satisfies ApiContract<
  undefined,
  typeof ResolveTenantContextQuerySchema,
  undefined,
  undefined,
  typeof TrustedTenantContextSchema
>;
