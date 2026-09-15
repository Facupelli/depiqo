import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { TenantPermissionSchema } from "./tenant-permission.schema";

export const TenantRoleSystemRoleSchema = z.enum(["ADMIN"]);

export const TenantRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  systemRole: TenantRoleSystemRoleSchema.nullable(),
  isSystem: z.boolean(),
  permissions: z.array(TenantPermissionSchema),
  assignedUserCount: z.number().int().nonnegative(),
  isInUse: z.boolean(),
});

export const TenantRoleParamsSchema = z.object({ roleId: z.string().min(1) });

export const TenantRoleBodySchema = z.object({
  name: z.string().trim().min(1),
  permissions: z.array(TenantPermissionSchema),
});

export const TenantPermissionMetadataSchema = z.object({
  id: TenantPermissionSchema,
  group: z.string(),
  label: z.string(),
  description: z.string(),
});

export const GetTenantRolesResponseSchema = z.array(TenantRoleSchema);
export const GetTenantRoleResponseSchema = TenantRoleSchema;
export const CreateTenantRoleResponseSchema = TenantRoleSchema;
export const UpdateTenantRoleResponseSchema = TenantRoleSchema;
export const DeleteTenantRoleResponseSchema = z.object({ id: z.string() });
export const GetTenantPermissionCatalogResponseSchema = z.array(TenantPermissionMetadataSchema);

export type TenantRoleDto = z.infer<typeof TenantRoleSchema>;
export type TenantRoleParamsDto = z.infer<typeof TenantRoleParamsSchema>;
export type TenantRoleBodyDto = z.infer<typeof TenantRoleBodySchema>;
export type TenantPermissionMetadataDto = z.infer<typeof TenantPermissionMetadataSchema>;

export const getTenantRolesContract = {
  method: "GET",
  path: "/tenant-management/roles",
  response: GetTenantRolesResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, undefined, typeof GetTenantRolesResponseSchema>;

export const getTenantRoleContract = {
  method: "GET",
  path: "/tenant-management/roles/:roleId",
  params: TenantRoleParamsSchema,
  response: GetTenantRoleResponseSchema,
} satisfies ApiContract<typeof TenantRoleParamsSchema, undefined, undefined, undefined, typeof GetTenantRoleResponseSchema>;

export const createTenantRoleContract = {
  method: "POST",
  path: "/tenant-management/roles",
  body: TenantRoleBodySchema,
  response: CreateTenantRoleResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, typeof TenantRoleBodySchema, typeof CreateTenantRoleResponseSchema>;

export const updateTenantRoleContract = {
  method: "PUT",
  path: "/tenant-management/roles/:roleId",
  params: TenantRoleParamsSchema,
  body: TenantRoleBodySchema,
  response: UpdateTenantRoleResponseSchema,
} satisfies ApiContract<typeof TenantRoleParamsSchema, undefined, undefined, typeof TenantRoleBodySchema, typeof UpdateTenantRoleResponseSchema>;

export const deleteTenantRoleContract = {
  method: "DELETE",
  path: "/tenant-management/roles/:roleId",
  params: TenantRoleParamsSchema,
  response: DeleteTenantRoleResponseSchema,
} satisfies ApiContract<typeof TenantRoleParamsSchema, undefined, undefined, undefined, typeof DeleteTenantRoleResponseSchema>;

export const getTenantPermissionCatalogContract = {
  method: "GET",
  path: "/tenant-management/roles/permissions",
  response: GetTenantPermissionCatalogResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, undefined, typeof GetTenantPermissionCatalogResponseSchema>;
