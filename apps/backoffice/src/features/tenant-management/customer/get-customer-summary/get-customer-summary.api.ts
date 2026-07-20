import {
	GetCustomerSummaryParamsSchema,
	type GetCustomerSummaryResponseDto,
	GetCustomerSummaryResponseSchema,
	getCustomerSummaryContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getCustomerSummary(
	customerId: string,
): Promise<GetCustomerSummaryResponseDto> {
	const parsedParams = GetCustomerSummaryParamsSchema.parse({
		customerId,
	});
	const path = getCustomerSummaryContract.path.replace(
		":customerId",
		encodeURIComponent(parsedParams.customerId),
	);

	const response = await apiFetch(path, {
		method: getCustomerSummaryContract.method,
	});

	return GetCustomerSummaryResponseSchema.parse(response);
}
