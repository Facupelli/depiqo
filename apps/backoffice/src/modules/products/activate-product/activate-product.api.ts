import {
	ActivateRentableItemParamsSchema,
	type ActivateRentableItemResponseDto,
	ActivateRentableItemResponseSchema,
	activateRentableItemContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export interface ActivateProductVariables {
	rentableItemId: string;
}

export async function activateProduct(
	variables: ActivateProductVariables,
): Promise<ActivateRentableItemResponseDto> {
	const parsedParams = ActivateRentableItemParamsSchema.parse(variables);
	const path = activateRentableItemContract.path.replace(
		":rentableItemId",
		encodeURIComponent(parsedParams.rentableItemId),
	);

	const response = await apiFetch(path, {
		method: activateRentableItemContract.method,
	});

	return ActivateRentableItemResponseSchema.parse(response);
}
