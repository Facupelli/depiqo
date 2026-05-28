import {
	type ConfirmRentalParamsDto,
	ConfirmRentalParamsSchema,
	type ConfirmRentalResponseDto,
	ConfirmRentalResponseSchema,
	confirmRentalContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export type ConfirmRentalVariables = {
	rentalId: ConfirmRentalParamsDto["rentalId"];
};

export async function confirmRental({
	rentalId,
}: ConfirmRentalVariables): Promise<ConfirmRentalResponseDto> {
	const parsedParams = ConfirmRentalParamsSchema.parse({ rentalId });
	const path = confirmRentalContract.path.replace(
		":rentalId",
		encodeURIComponent(parsedParams.rentalId),
	);

	await apiFetch(path, {
		method: confirmRentalContract.method,
	});

	return ConfirmRentalResponseSchema.parse(undefined);
}
