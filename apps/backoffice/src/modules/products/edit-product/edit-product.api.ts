import {
	type UpdateRentableItemDefinitionBodyDto,
	UpdateRentableItemDefinitionBodySchema,
	UpdateRentableItemDefinitionParamsSchema,
	type UpdateRentableItemDefinitionResponseDto,
	UpdateRentableItemDefinitionResponseSchema,
	updateRentableItemDefinitionContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export interface UpdateProductVariables {
	rentableItemId: string;
	body: UpdateRentableItemDefinitionBodyDto;
}

export async function updateProduct({
	rentableItemId,
	body,
}: UpdateProductVariables): Promise<UpdateRentableItemDefinitionResponseDto> {
	const parsedParams = UpdateRentableItemDefinitionParamsSchema.parse({
		rentableItemId,
	});
	const parsedBody = UpdateRentableItemDefinitionBodySchema.parse(body);
	const path = updateRentableItemDefinitionContract.path.replace(
		":rentableItemId",
		encodeURIComponent(parsedParams.rentableItemId),
	);

	const response = await apiFetch(path, {
		method: updateRentableItemDefinitionContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return UpdateRentableItemDefinitionResponseSchema.parse(response);
}
