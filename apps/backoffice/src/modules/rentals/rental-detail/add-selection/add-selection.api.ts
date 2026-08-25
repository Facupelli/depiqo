import {
	type AddRentalSelectionBodyDto,
	AddRentalSelectionBodySchema,
	type AddRentalSelectionParamsDto,
	AddRentalSelectionParamsSchema,
	type AddRentalSelectionResponseDto,
	AddRentalSelectionResponseSchema,
	addRentalSelectionContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type AddRentalSelectionVariables = {
	rentalId: AddRentalSelectionParamsDto["rentalId"];
} & AddRentalSelectionBodyDto;

export async function addRentalSelection({
	rentalId,
	expectedVersion,
	rentalOfferId,
	quantity,
}: AddRentalSelectionVariables): Promise<AddRentalSelectionResponseDto> {
	const parsedParams = AddRentalSelectionParamsSchema.parse({ rentalId });
	const path = addRentalSelectionContract.path.replace(
		":rentalId",
		encodeURIComponent(parsedParams.rentalId),
	);
	const parsedBody = AddRentalSelectionBodySchema.parse({
		expectedVersion,
		rentalOfferId,
		quantity,
	});

	const response = await apiFetch(path, {
		method: addRentalSelectionContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return AddRentalSelectionResponseSchema.parse(response);
}
