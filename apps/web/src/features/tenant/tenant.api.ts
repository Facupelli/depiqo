import {
	type ProblemDetails,
	type TenantResponse,
	type UpdateTenantBrandingDto,
	type UpdateTenantConfigDto,
	updateTenantBrandingSchema,
	updateTenantConfigSchema,
} from "@repo/schemas";
import { createServerFn } from "@tanstack/react-start";
import { authenticatedApiFetch } from "@/lib/api-auth";
import { ProblemDetailsError } from "@/shared/errors";

const apiUrl = "/tenants";

export async function getCurrentTenantServer(): Promise<TenantResponse> {
	const result = await authenticatedApiFetch<TenantResponse>(`${apiUrl}/me`, {
		method: "GET",
	});

	return result;
}

export const getCurrentTenant = createServerFn({ method: "GET" }).handler(
	async (): Promise<TenantResponse> => getCurrentTenantServer(),
);

export const updateTenantConfig = createServerFn({ method: "POST" })
	.inputValidator((data: UpdateTenantConfigDto) =>
		updateTenantConfigSchema.parse(data),
	)
	.handler(async ({ data }): Promise<string | { error: ProblemDetails }> => {
		try {
			const result = await authenticatedApiFetch<string>(`${apiUrl}/config`, {
				method: "PATCH",
				body: data,
			});

			return result;
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				return { error: error.problemDetails };
			}
			throw error;
		}
	});

export const updateTenantBranding = createServerFn({ method: "POST" })
	.inputValidator((data: UpdateTenantBrandingDto) =>
		updateTenantBrandingSchema.parse(data),
	)
	.handler(async ({ data }): Promise<void> => {
		await authenticatedApiFetch<void>(`${apiUrl}/branding`, {
			method: "PATCH",
			body: data,
		});
	});
