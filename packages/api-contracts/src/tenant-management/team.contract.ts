import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { TenantRoleSystemRoleSchema } from "./roles.contract";

export const TenantCollaboratorStatusSchema = z.enum(["ACTIVE", "SUSPENDED"]);

export const TenantCollaboratorRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  systemRole: TenantRoleSystemRoleSchema.nullable(),
});

export const TenantCollaboratorSchema = z.object({
  id: z.string(),
  email: z.email(),
  status: TenantCollaboratorStatusSchema,
  mustChangePassword: z.boolean(),
  role: TenantCollaboratorRoleSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TenantCollaboratorParamsSchema = z.object({ tenantUserId: z.string().min(1) });
export const CreateTenantCollaboratorBodySchema = z.object({
  email: z.email(),
  roleId: z.string().min(1),
});
export const ChangeTenantCollaboratorRoleBodySchema = z.object({ roleId: z.string().min(1) });

export const GetTenantCollaboratorsResponseSchema = z.array(TenantCollaboratorSchema);
export const GetTenantCollaboratorResponseSchema = TenantCollaboratorSchema;
export const CreateTenantCollaboratorResponseSchema = z.object({
  collaborator: TenantCollaboratorSchema,
  temporaryPassword: z.string().min(1),
});
export const ChangeTenantCollaboratorRoleResponseSchema = TenantCollaboratorSchema;
export const SuspendTenantCollaboratorResponseSchema = TenantCollaboratorSchema;
export const ReactivateTenantCollaboratorResponseSchema = TenantCollaboratorSchema;
export const ResetTenantCollaboratorPasswordResponseSchema = z.object({
  collaborator: TenantCollaboratorSchema,
  temporaryPassword: z.string().min(1),
});

export type TenantCollaboratorDto = z.infer<typeof TenantCollaboratorSchema>;
export type CreateTenantCollaboratorResponseDto = z.infer<typeof CreateTenantCollaboratorResponseSchema>;
export type ResetTenantCollaboratorPasswordResponseDto = z.infer<typeof ResetTenantCollaboratorPasswordResponseSchema>;

export const getTenantCollaboratorsContract = {
  method: "GET",
  path: "/tenant-management/team",
  response: GetTenantCollaboratorsResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, undefined, typeof GetTenantCollaboratorsResponseSchema>;

export const getTenantCollaboratorContract = {
  method: "GET",
  path: "/tenant-management/team/:tenantUserId",
  params: TenantCollaboratorParamsSchema,
  response: GetTenantCollaboratorResponseSchema,
} satisfies ApiContract<typeof TenantCollaboratorParamsSchema, undefined, undefined, undefined, typeof GetTenantCollaboratorResponseSchema>;

export const createTenantCollaboratorContract = {
  method: "POST",
  path: "/tenant-management/team",
  body: CreateTenantCollaboratorBodySchema,
  response: CreateTenantCollaboratorResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, typeof CreateTenantCollaboratorBodySchema, typeof CreateTenantCollaboratorResponseSchema>;

export const changeTenantCollaboratorRoleContract = {
  method: "PUT",
  path: "/tenant-management/team/:tenantUserId/role",
  params: TenantCollaboratorParamsSchema,
  body: ChangeTenantCollaboratorRoleBodySchema,
  response: ChangeTenantCollaboratorRoleResponseSchema,
} satisfies ApiContract<typeof TenantCollaboratorParamsSchema, undefined, undefined, typeof ChangeTenantCollaboratorRoleBodySchema, typeof ChangeTenantCollaboratorRoleResponseSchema>;

export const suspendTenantCollaboratorContract = {
  method: "POST",
  path: "/tenant-management/team/:tenantUserId/suspend",
  params: TenantCollaboratorParamsSchema,
  response: SuspendTenantCollaboratorResponseSchema,
} satisfies ApiContract<typeof TenantCollaboratorParamsSchema, undefined, undefined, undefined, typeof SuspendTenantCollaboratorResponseSchema>;

export const reactivateTenantCollaboratorContract = {
  method: "POST",
  path: "/tenant-management/team/:tenantUserId/reactivate",
  params: TenantCollaboratorParamsSchema,
  response: ReactivateTenantCollaboratorResponseSchema,
} satisfies ApiContract<typeof TenantCollaboratorParamsSchema, undefined, undefined, undefined, typeof ReactivateTenantCollaboratorResponseSchema>;

export const resetTenantCollaboratorPasswordContract = {
  method: "POST",
  path: "/tenant-management/team/:tenantUserId/reset-password",
  params: TenantCollaboratorParamsSchema,
  response: ResetTenantCollaboratorPasswordResponseSchema,
} satisfies ApiContract<typeof TenantCollaboratorParamsSchema, undefined, undefined, undefined, typeof ResetTenantCollaboratorPasswordResponseSchema>;
