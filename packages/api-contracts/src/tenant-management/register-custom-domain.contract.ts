import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { TenantDomainSchema } from "./tenant-domain.contract";

export const RegisterCustomDomainBodySchema = z.object({
  domain: z.string().trim().min(1),
});

export const RegisterCustomDomainResponseSchema = z.object({
  domain: TenantDomainSchema,
  cnameTarget: z.string(),
});

export type RegisterCustomDomainBodyDto = z.infer<typeof RegisterCustomDomainBodySchema>;
export type RegisterCustomDomainResponseDto = z.infer<typeof RegisterCustomDomainResponseSchema>;

export const registerCustomDomainContract = {
  method: "POST",
  path: "/tenant-management/tenant/custom-domain",
  body: RegisterCustomDomainBodySchema,
  response: RegisterCustomDomainResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof RegisterCustomDomainBodySchema,
  typeof RegisterCustomDomainResponseSchema
>;
