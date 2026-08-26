import { z } from "zod";

export const TenantDomainStatusSchema = z.enum(["PENDING", "VERIFIED", "DISABLED"]);

export const TenantDomainSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  domain: z.string(),
  status: TenantDomainStatusSchema,
  isPrimary: z.boolean(),
  cfHostnameId: z.string().nullable(),
  verifiedAt: z.string().datetime().nullable(),
  lastCheckedAt: z.string().datetime().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TenantDomainStatusDto = z.infer<typeof TenantDomainStatusSchema>;
export type TenantDomainDto = z.infer<typeof TenantDomainSchema>;
