import {
	type ConfirmRentalBodyDto,
	ConfirmRentalBodySchema,
	type ConfirmRentalParamsDto,
	ConfirmRentalParamsSchema,
	type ConfirmRentalResponseDto,
	ConfirmRentalResponseSchema,
	confirmRentalContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type ConfirmRentalVariables = ConfirmRentalBodyDto & {
	rentalId: ConfirmRentalParamsDto["rentalId"];
};

export async function confirmRental({
	rentalId,
	expectedVersion,
}: ConfirmRentalVariables): Promise<ConfirmRentalResponseDto> {
	const parsedParams = ConfirmRentalParamsSchema.parse({ rentalId });
	const body = ConfirmRentalBodySchema.parse({ expectedVersion });
	const path = confirmRentalContract.path.replace(
		":rentalId",
		encodeURIComponent(parsedParams.rentalId),
	);

	await apiFetch(path, {
		method: confirmRentalContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	return ConfirmRentalResponseSchema.parse(undefined);
}
