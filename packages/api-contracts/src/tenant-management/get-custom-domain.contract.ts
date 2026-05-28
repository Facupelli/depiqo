import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { TenantDomainSchema } from "./tenant-domain.contract";

export const GetCustomDomainResponseSchema = TenantDomainSchema.nullable();

export type GetCustomDomainResponseDto = z.infer<typeof GetCustomDomainResponseSchema>;

export const getCustomDomainContract = {
  method: "GET",
  path: "/v2/tenant-management/tenant/custom-domain",
  response: GetCustomDomainResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, undefined, typeof GetCustomDomainResponseSchema>;
