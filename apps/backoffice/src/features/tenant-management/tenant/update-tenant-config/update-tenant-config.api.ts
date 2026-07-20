import {
	type UpdateTenantConfigBodyDto,
	UpdateTenantConfigBodySchema,
	type UpdateTenantConfigResponseDto,
	UpdateTenantConfigResponseSchema,
	updateTenantConfigContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type UpdateTenantConfigVariables = UpdateTenantConfigBodyDto;

export async function updateTenantConfig(
	body: UpdateTenantConfigVariables,
): Promise<UpdateTenantConfigResponseDto> {
	const parsedBody = UpdateTenantConfigBodySchema.parse(body);

	const response = await apiFetch(updateTenantConfigContract.path, {
		method: updateTenantConfigContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return UpdateTenantConfigResponseSchema.parse(response);
}
