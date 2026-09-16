import {
	ChangeTenantCollaboratorRoleBodySchema,
	ChangeTenantCollaboratorRoleResponseSchema,
	CreateTenantCollaboratorBodySchema,
	type CreateTenantCollaboratorResponseDto,
	CreateTenantCollaboratorResponseSchema,
	changeTenantCollaboratorRoleContract,
	createTenantCollaboratorContract,
	GetTenantCollaboratorsResponseSchema,
	GetTenantRolesResponseSchema,
	getTenantCollaboratorsContract,
	getTenantRolesContract,
	ReactivateTenantCollaboratorResponseSchema,
	type ResetTenantCollaboratorPasswordResponseDto,
	ResetTenantCollaboratorPasswordResponseSchema,
	reactivateTenantCollaboratorContract,
	resetTenantCollaboratorPasswordContract,
	SuspendTenantCollaboratorResponseSchema,
	suspendTenantCollaboratorContract,
	type TenantCollaboratorDto,
	TenantCollaboratorParamsSchema,
	type TenantRoleDto,
} from "@repo/api-contracts";
import type { z } from "zod";

type CreateTenantCollaboratorBodyDto = z.infer<
	typeof CreateTenantCollaboratorBodySchema
>;
type ChangeTenantCollaboratorRoleBodyDto = z.infer<
	typeof ChangeTenantCollaboratorRoleBodySchema
>;

import { apiFetch } from "@/lib/api/api-fetch";

function collaboratorPath(path: string, tenantUserId: string): string {
	const params = TenantCollaboratorParamsSchema.parse({ tenantUserId });
	return path.replace(":tenantUserId", encodeURIComponent(params.tenantUserId));
}

export async function getTeamMembers(): Promise<TenantCollaboratorDto[]> {
	const response = await apiFetch(getTenantCollaboratorsContract.path, {
		method: getTenantCollaboratorsContract.method,
	});
	return GetTenantCollaboratorsResponseSchema.parse(response);
}

export async function getTeamRoles(): Promise<TenantRoleDto[]> {
	const response = await apiFetch(getTenantRolesContract.path, {
		method: getTenantRolesContract.method,
	});
	return GetTenantRolesResponseSchema.parse(response);
}

export async function createTeamMember(
	body: CreateTenantCollaboratorBodyDto,
): Promise<CreateTenantCollaboratorResponseDto> {
	const parsedBody = CreateTenantCollaboratorBodySchema.parse(body);
	const response = await apiFetch(createTenantCollaboratorContract.path, {
		method: createTenantCollaboratorContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});
	return CreateTenantCollaboratorResponseSchema.parse(response);
}

export async function changeTeamMemberRole(input: {
	tenantUserId: string;
	body: ChangeTenantCollaboratorRoleBodyDto;
}): Promise<TenantCollaboratorDto> {
	const body = ChangeTenantCollaboratorRoleBodySchema.parse(input.body);
	const response = await apiFetch(
		collaboratorPath(
			changeTenantCollaboratorRoleContract.path,
			input.tenantUserId,
		),
		{
			method: changeTenantCollaboratorRoleContract.method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		},
	);
	return ChangeTenantCollaboratorRoleResponseSchema.parse(response);
}

async function runMemberAction(
	contract: { path: string; method: "POST" },
	tenantUserId: string,
): Promise<TenantCollaboratorDto> {
	const response = await apiFetch(
		collaboratorPath(contract.path, tenantUserId),
		{ method: contract.method },
	);
	return contract === suspendTenantCollaboratorContract
		? SuspendTenantCollaboratorResponseSchema.parse(response)
		: ReactivateTenantCollaboratorResponseSchema.parse(response);
}

export function suspendTeamMember(
	tenantUserId: string,
): Promise<TenantCollaboratorDto> {
	return runMemberAction(suspendTenantCollaboratorContract, tenantUserId);
}

export function reactivateTeamMember(
	tenantUserId: string,
): Promise<TenantCollaboratorDto> {
	return runMemberAction(reactivateTenantCollaboratorContract, tenantUserId);
}

export async function resetTeamMemberPassword(
	tenantUserId: string,
): Promise<ResetTenantCollaboratorPasswordResponseDto> {
	const response = await apiFetch(
		collaboratorPath(
			resetTenantCollaboratorPasswordContract.path,
			tenantUserId,
		),
		{ method: resetTenantCollaboratorPasswordContract.method },
	);
	return ResetTenantCollaboratorPasswordResponseSchema.parse(response);
}
