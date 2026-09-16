import {
	ChangeTenantCollaboratorRoleBodySchema,
	CreateTenantCollaboratorBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

type CreateTenantCollaboratorBodyDto = z.infer<
	typeof CreateTenantCollaboratorBodySchema
>;
type ChangeTenantCollaboratorRoleBodyDto = z.infer<
	typeof ChangeTenantCollaboratorRoleBodySchema
>;

export const createTeamMemberFormSchema = z.object({
	email: z.email("Ingresa un correo electrónico válido"),
	roleId: z.string().min(1, "Selecciona un rol"),
});

export type CreateTeamMemberFormValues = z.infer<
	typeof createTeamMemberFormSchema
>;

export function createTeamMemberFormDefaults(): CreateTeamMemberFormValues {
	return { email: "", roleId: "" };
}

export function toCreateTeamMemberDto(
	values: CreateTeamMemberFormValues,
): CreateTenantCollaboratorBodyDto {
	return CreateTenantCollaboratorBodySchema.parse({
		email: values.email.trim(),
		roleId: values.roleId,
	});
}

export const changeTeamMemberRoleFormSchema = z.object({
	roleId: z.string().min(1, "Selecciona un rol"),
});

export type ChangeTeamMemberRoleFormValues = z.infer<
	typeof changeTeamMemberRoleFormSchema
>;

export function changeTeamMemberRoleFormDefaults(
	roleId: string,
): ChangeTeamMemberRoleFormValues {
	return { roleId };
}

export function toChangeTeamMemberRoleDto(
	values: ChangeTeamMemberRoleFormValues,
): ChangeTenantCollaboratorRoleBodyDto {
	return ChangeTenantCollaboratorRoleBodySchema.parse(values);
}
