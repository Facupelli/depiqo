import { z } from "zod";

import type { ApiContract } from "../../api-contract";
import { TenantPermissionSchema } from "../tenant-permission.schema";
import { AuthCustomerSchema, AuthUserSchema } from "./login.contract";

const WorkingBranchContextSchema = z.object({
  workingBranchId: z.string().nullable(),
});

export const CurrentTenantRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  systemRole: z.literal("ADMIN").nullable(),
});

export const CurrentTenantUserSchema = AuthUserSchema.extend({
  ...WorkingBranchContextSchema.shape,
  tenantRole: CurrentTenantRoleSchema,
  permissions: z.array(TenantPermissionSchema),
});

export const CurrentTenantCustomerSchema = AuthCustomerSchema.extend(WorkingBranchContextSchema.shape);

export const GetCurrentUserResponseSchema = z.discriminatedUnion("actorType", [
  CurrentTenantUserSchema,
  CurrentTenantCustomerSchema,
]);

export type GetCurrentUserResponseDto = z.infer<typeof GetCurrentUserResponseSchema>;

export const getCurrentUserContract = {
  method: "GET",
  path: "/auth/me",
  response: GetCurrentUserResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, undefined, typeof GetCurrentUserResponseSchema>;
