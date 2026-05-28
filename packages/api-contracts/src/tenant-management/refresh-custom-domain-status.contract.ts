import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { TenantDomainSchema } from "./tenant-domain.contract";

export const RefreshCustomDomainStatusResponseSchema = TenantDomainSchema;

export type RefreshCustomDomainStatusResponseDto = z.infer<typeof RefreshCustomDomainStatusResponseSchema>;

export const refreshCustomDomainStatusContract = {
  method: "POST",
  path: "/v2/tenant-management/tenant/custom-domain/refresh",
  response: RefreshCustomDomainStatusResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, undefined, typeof RefreshCustomDomainStatusResponseSchema>;
