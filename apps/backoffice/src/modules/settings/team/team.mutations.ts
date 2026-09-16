import type {
	ChangeTenantCollaboratorRoleBodySchema,
	CreateTenantCollaboratorBodySchema,
	CreateTenantCollaboratorResponseDto,
	ResetTenantCollaboratorPasswordResponseDto,
	TenantCollaboratorDto,
} from "@repo/api-contracts";
import type { z } from "zod";

type CreateTenantCollaboratorBodyDto = z.infer<
	typeof CreateTenantCollaboratorBodySchema
>;
type ChangeTenantCollaboratorRoleBodyDto = z.infer<
	typeof ChangeTenantCollaboratorRoleBodySchema
>;

import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	changeTeamMemberRole,
	createTeamMember,
	reactivateTeamMember,
	resetTeamMemberPassword,
	suspendTeamMember,
} from "./team.api";
import { teamKeys } from "./team.queries";

const memberListMutationMeta = { invalidates: teamKeys.list() };
const roleAssignmentMutationMeta = {
	invalidates: [teamKeys.list(), teamKeys.roles()],
};

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
