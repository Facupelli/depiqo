import {
	type RemoveRentalSelectionBodyDto,
	RemoveRentalSelectionBodySchema,
	type RemoveRentalSelectionParamsDto,
	RemoveRentalSelectionParamsSchema,
	type RemoveRentalSelectionResponseDto,
	RemoveRentalSelectionResponseSchema,
	removeRentalSelectionContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type RemoveSelectionVariables = RemoveRentalSelectionParamsDto &
	RemoveRentalSelectionBodyDto;

export async function removeSelection({
	rentalId,
	selectionId,
	...body
}: RemoveSelectionVariables): Promise<RemoveRentalSelectionResponseDto> {
	const params = RemoveRentalSelectionParamsSchema.parse({
		rentalId,
		selectionId,
	});
	const parsedBody = RemoveRentalSelectionBodySchema.parse(body);
	const path = removeRentalSelectionContract.path
		.replace(":rentalId", encodeURIComponent(params.rentalId))
		.replace(":selectionId", encodeURIComponent(params.selectionId));
	const response = await apiFetch(path, {
		method: removeRentalSelectionContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return RemoveRentalSelectionResponseSchema.parse(response);
}
