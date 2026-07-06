import {
	type GetCurrentRentalCustomerProfileResponseDto,
	GetCurrentRentalCustomerProfileResponseSchema,
	getCurrentRentalCustomerProfileContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getCurrentRentalCustomerProfile(): Promise<GetCurrentRentalCustomerProfileResponseDto> {
	const response = await apiFetch(
		getCurrentRentalCustomerProfileContract.path,
		{
			method: getCurrentRentalCustomerProfileContract.method,
		},
	);

	return GetCurrentRentalCustomerProfileResponseSchema.parse(response);
}
