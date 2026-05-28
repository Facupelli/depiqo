import {
	GetCustomerProfileDetailParamsSchema,
	type GetCustomerProfileDetailResponseDto,
	GetCustomerProfileDetailResponseSchema,
	getCustomerProfileDetailContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export async function getCustomerProfileDetail(
	customerId: string,
): Promise<GetCustomerProfileDetailResponseDto> {
	const parsedParams = GetCustomerProfileDetailParamsSchema.parse({
		customerId,
	});
	const path = getCustomerProfileDetailContract.path.replace(
		":customerId",
		encodeURIComponent(parsedParams.customerId),
	);

	const response = await apiFetch(path, {
		method: getCustomerProfileDetailContract.method,
	});

	return GetCustomerProfileDetailResponseSchema.parse(response);
}
