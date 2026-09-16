import type {
	ChangeTenantCollaboratorRoleBodySchema,
	CreateTenantCollaboratorBodySchema,
	CreateTenantCollaboratorResponseDto,
	ResetTenantCollaboratorPasswordResponseDto,
	TenantCollaboratorDto,
	TenantRoleBodyDto,
	TenantRoleDto,
} from "@repo/api-contracts";
import type { z } from "zod";

type CreateTenantCollaboratorBodyDto = z.infer<
	typeof CreateTenantCollaboratorBodySchema
>;
type ChangeTenantCollaboratorRoleBodyDto = z.infer<
	typeof ChangeTenantCollaboratorRoleBodySchema
>;

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { v2AuthKeys } from "@/auth/auth.queries";
import {
	getProblemDetailsCode,
	type ProblemDetailsError,
} from "@/shared/errors";
import {
	changeTeamMemberRole,
	createTeamMember,
	createTeamRole,
	deleteTeamRole,
	reactivateTeamMember,
	resetTeamMemberPassword,
	suspendTeamMember,
	updateTeamRole,
} from "./team.api";
import { teamKeys } from "./team.queries";

const memberListMutationMeta = { invalidates: teamKeys.list() };
const roleAssignmentMutationMeta = {
	invalidates: [teamKeys.list(), teamKeys.roles()],
};

export function useCreateTeamRole() {
	return useMutation<TenantRoleDto, ProblemDetailsError, TenantRoleBodyDto>({
		mutationFn: createTeamRole,
		meta: { invalidates: teamKeys.roles() },
	});
}

export function useUpdateTeamRole(currentRoleId: string) {
	const queryClient = useQueryClient();
	const router = useRouter();

	return useMutation<
		TenantRoleDto,
		ProblemDetailsError,
		{ roleId: string; body: TenantRoleBodyDto }
	>({
		mutationFn: updateTeamRole,
		meta: { invalidates: [teamKeys.roles(), teamKeys.list()] },
		onSuccess: async (_role, variables) => {
			if (variables.roleId !== currentRoleId) return;
			queryClient.removeQueries({ queryKey: v2AuthKeys.current() });
			await router.invalidate({ sync: true });
		},
		onError: async (error) => {
			if (getProblemDetailsCode(error) === "tenant_management.role_not_found") {
				await queryClient.invalidateQueries({ queryKey: teamKeys.roles() });
			}
		},
	});
}

export function useDeleteTeamRole() {
	const queryClient = useQueryClient();

	return useMutation<{ id: string }, ProblemDetailsError, string>({
		mutationFn: deleteTeamRole,
		meta: { invalidates: teamKeys.roles() },
		onError: async (error) => {
			const code = getProblemDetailsCode(error);
			if (
				code === "tenant_management.role_not_found" ||
				code === "tenant_management.role_in_use"
			) {
				await queryClient.invalidateQueries({ queryKey: teamKeys.roles() });
			}
		},
	});
}

export function useCreateTeamMember() {
	return useMutation<
		CreateTenantCollaboratorResponseDto,
		ProblemDetailsError,
		CreateTenantCollaboratorBodyDto
	>({ mutationFn: createTeamMember, meta: roleAssignmentMutationMeta });
}

export function useChangeTeamMemberRole() {
	return useMutation<
		TenantCollaboratorDto,
		ProblemDetailsError,
		{ tenantUserId: string; body: ChangeTenantCollaboratorRoleBodyDto }
	>({ mutationFn: changeTeamMemberRole, meta: roleAssignmentMutationMeta });
}

export function useSuspendTeamMember() {
	return useMutation<TenantCollaboratorDto, ProblemDetailsError, string>({
		mutationFn: suspendTeamMember,
		meta: memberListMutationMeta,
	});
}

export function useReactivateTeamMember() {
	return useMutation<TenantCollaboratorDto, ProblemDetailsError, string>({
		mutationFn: reactivateTeamMember,
		meta: memberListMutationMeta,
	});
}

export function useResetTeamMemberPassword() {
	return useMutation<
		ResetTenantCollaboratorPasswordResponseDto,
		ProblemDetailsError,
		string
	>({ mutationFn: resetTeamMemberPassword, meta: memberListMutationMeta });
}
