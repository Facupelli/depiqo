import {
	TenantPermissionSchema,
	type TenantRoleBodyDto,
	TenantRoleBodySchema,
	type TenantRoleDto,
} from "@repo/api-contracts";
import { z } from "zod";

export const roleFormSchema = z.object({
	name: z.string().trim().min(1, "Ingresa un nombre para el rol"),
	permissions: z.array(TenantPermissionSchema),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;

export function createRoleFormDefaults(): RoleFormValues {
	return { name: "", permissions: [] };
}

export function roleToFormValues(role: TenantRoleDto): RoleFormValues {
	return { name: role.name, permissions: [...role.permissions] };
}

export function toRoleBodyDto(values: RoleFormValues): TenantRoleBodyDto {
	return TenantRoleBodySchema.parse({
		name: values.name.trim(),
		permissions: values.permissions,
	});
}
