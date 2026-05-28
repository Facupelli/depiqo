import {
	type UpdateTenantBrandingBodyDto,
	UpdateTenantBrandingBodySchema,
	type UpdateTenantBrandingResponseDto,
	UpdateTenantBrandingResponseSchema,
	updateTenantBrandingContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export type UpdateTenantBrandingVariables = UpdateTenantBrandingBodyDto;

export async function updateTenantBranding(
	body: UpdateTenantBrandingVariables,
): Promise<UpdateTenantBrandingResponseDto> {
	const parsedBody = UpdateTenantBrandingBodySchema.parse(body);

	const response = await apiFetch(updateTenantBrandingContract.path, {
		method: updateTenantBrandingContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return UpdateTenantBrandingResponseSchema.parse(response);
}
