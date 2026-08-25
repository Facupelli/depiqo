import {
	type ChangeRentalSelectionQuantityBodyDto,
	ChangeRentalSelectionQuantityBodySchema,
	type ChangeRentalSelectionQuantityParamsDto,
	ChangeRentalSelectionQuantityParamsSchema,
	type ChangeRentalSelectionQuantityResponseDto,
	ChangeRentalSelectionQuantityResponseSchema,
	changeRentalSelectionQuantityContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type ChangeSelectionQuantityVariables =
	ChangeRentalSelectionQuantityParamsDto & ChangeRentalSelectionQuantityBodyDto;

export async function changeSelectionQuantity({
	rentalId,
	selectionId,
	...body
}: ChangeSelectionQuantityVariables): Promise<ChangeRentalSelectionQuantityResponseDto> {
	const params = ChangeRentalSelectionQuantityParamsSchema.parse({
		rentalId,
		selectionId,
	});
	const parsedBody = ChangeRentalSelectionQuantityBodySchema.parse(body);
	const path = changeRentalSelectionQuantityContract.path
		.replace(":rentalId", encodeURIComponent(params.rentalId))
		.replace(":selectionId", encodeURIComponent(params.selectionId));
	const response = await apiFetch(path, {
		method: changeRentalSelectionQuantityContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return ChangeRentalSelectionQuantityResponseSchema.parse(response);
}
