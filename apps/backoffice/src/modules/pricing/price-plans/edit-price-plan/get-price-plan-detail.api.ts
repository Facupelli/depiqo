import {
	GetRatePlanDetailParamsSchema,
	type GetRatePlanDetailResponseDto,
	GetRatePlanDetailResponseSchema,
	getRatePlanDetailContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getPricePlanDetail(
	ratePlanId: string,
): Promise<GetRatePlanDetailResponseDto> {
	const params = GetRatePlanDetailParamsSchema.parse({ ratePlanId });
	const path = getRatePlanDetailContract.path.replace(
		":ratePlanId",
		encodeURIComponent(params.ratePlanId),
	);
	const response = await apiFetch(path, {
		method: getRatePlanDetailContract.method,
	});

	return GetRatePlanDetailResponseSchema.parse(response);
}
