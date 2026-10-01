import {
	RestoreRentableItemParamsSchema,
	type RestoreRentableItemResponseDto,
	RestoreRentableItemResponseSchema,
	restoreRentableItemContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export interface RestoreProductVariables {
	rentableItemId: string;
}

export async function restoreProduct(
	variables: RestoreProductVariables,
): Promise<RestoreRentableItemResponseDto> {
	const parsedParams = RestoreRentableItemParamsSchema.parse(variables);
	const path = restoreRentableItemContract.path.replace(
		":rentableItemId",
		encodeURIComponent(parsedParams.rentableItemId),
	);

	const response = await apiFetch(path, {
		method: restoreRentableItemContract.method,
	});

	return RestoreRentableItemResponseSchema.parse(response);
}
