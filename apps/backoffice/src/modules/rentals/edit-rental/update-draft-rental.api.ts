import {
	type UpdateDraftRentalBodyDto,
	UpdateDraftRentalBodySchema,
	type UpdateDraftRentalParamsDto,
	UpdateDraftRentalParamsSchema,
	type UpdateDraftRentalResponseDto,
	UpdateDraftRentalResponseSchema,
	updateDraftRentalContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type UpdateDraftRentalVariables = {
	rentalId: UpdateDraftRentalParamsDto["rentalId"];
	body: UpdateDraftRentalBodyDto;
};

export async function updateDraftRental({
	rentalId,
	body,
}: UpdateDraftRentalVariables): Promise<UpdateDraftRentalResponseDto> {
	const parsedParams = UpdateDraftRentalParamsSchema.parse({ rentalId });
	const parsedBody = UpdateDraftRentalBodySchema.parse(body);
	const path = updateDraftRentalContract.path.replace(
		":rentalId",
		encodeURIComponent(parsedParams.rentalId),
	);

	const response = await apiFetch(path, {
		method: updateDraftRentalContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return UpdateDraftRentalResponseSchema.parse(response);
}
