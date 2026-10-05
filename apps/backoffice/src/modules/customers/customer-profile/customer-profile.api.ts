import {
	GetBackofficeCustomerProfileParamsSchema,
	GetBackofficeCustomerProfileResponseSchema,
	getBackofficeCustomerProfileContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getBackofficeCustomerProfile(customerId: string) {
	const { customerId: id } = GetBackofficeCustomerProfileParamsSchema.parse({
		customerId,
	});
	const response = await apiFetch(
		getBackofficeCustomerProfileContract.path.replace(
			":customerId",
			encodeURIComponent(id),
		),
		{ method: getBackofficeCustomerProfileContract.method },
	);
	return GetBackofficeCustomerProfileResponseSchema.parse(response);
}
