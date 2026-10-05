import {
	GetBackofficeCustomerSensitiveProfileParamsSchema,
	GetBackofficeCustomerSensitiveProfileResponseSchema,
	getBackofficeCustomerSensitiveProfileContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getCustomerSensitiveProfile(
	customerId: string,
	signal: AbortSignal,
) {
	const params = GetBackofficeCustomerSensitiveProfileParamsSchema.parse({
		customerId,
	});
	const response = await apiFetch(
		getBackofficeCustomerSensitiveProfileContract.path.replace(
			":customerId",
			encodeURIComponent(params.customerId),
		),
		{ method: getBackofficeCustomerSensitiveProfileContract.method, signal },
	);
	return GetBackofficeCustomerSensitiveProfileResponseSchema.parse(response);
}
