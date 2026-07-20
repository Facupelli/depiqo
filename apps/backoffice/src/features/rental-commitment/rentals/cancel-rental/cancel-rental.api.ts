import {
	type CancelRentalParamsDto,
	CancelRentalParamsSchema,
	type CancelRentalResponseDto,
	CancelRentalResponseSchema,
	cancelRentalContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type CancelRentalVariables = {
	rentalId: CancelRentalParamsDto["rentalId"];
};

export async function cancelRental({
	rentalId,
}: CancelRentalVariables): Promise<CancelRentalResponseDto> {
	const parsedParams = CancelRentalParamsSchema.parse({ rentalId });
	const path = cancelRentalContract.path.replace(
		":rentalId",
		encodeURIComponent(parsedParams.rentalId),
	);

	await apiFetch(path, {
		method: cancelRentalContract.method,
	});

	return CancelRentalResponseSchema.parse(undefined);
}
