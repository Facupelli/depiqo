import {
	GetRentableItemDetailParamsSchema,
	type GetRentableItemDetailResponseDto,
	GetRentableItemDetailResponseSchema,
	getRentableItemDetailContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getProductDetail(
	rentableItemId: string,
): Promise<GetRentableItemDetailResponseDto> {
	const parsedParams = GetRentableItemDetailParamsSchema.parse({
		rentableItemId,
	});
	const path = getRentableItemDetailContract.path.replace(
		":rentableItemId",
		encodeURIComponent(parsedParams.rentableItemId),
	);

	const response = await apiFetch(path, {
		method: getRentableItemDetailContract.method,
	});

	return GetRentableItemDetailResponseSchema.parse(response);
}
