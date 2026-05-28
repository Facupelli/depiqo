import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const RegisterTenantWithOwnerBodySchema = z.object({
  tenant: z.object({
    name: z.string().trim().min(1),
  }),
  owner: z.object({
    name: z.string().trim().min(1),
    email: z.email(),
    password: z.string().min(8),
  }),
});

export const RegisterTenantWithOwnerResponseSchema = z.object({
  tenantId: z.string(),
  tenantUserId: z.string(),
});

export type RegisterTenantWithOwnerBodyDto = z.infer<
  typeof RegisterTenantWithOwnerBodySchema
>;
export type RegisterTenantWithOwnerResponseDto = z.infer<
  typeof RegisterTenantWithOwnerResponseSchema
>;

export const registerTenantWithOwnerContract = {
  method: "POST",
  path: "/v2/tenant-management/register",
  body: RegisterTenantWithOwnerBodySchema,
  response: RegisterTenantWithOwnerResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof RegisterTenantWithOwnerBodySchema,
  typeof RegisterTenantWithOwnerResponseSchema
>;
