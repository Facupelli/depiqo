import {
	GetRentalDetailParamsSchema,
	type GetRentalDetailResponseDto,
	GetRentalDetailResponseSchema,
	getRentalDetailContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getRentalDetail(
	rentalId: string,
): Promise<GetRentalDetailResponseDto> {
	const parsedParams = GetRentalDetailParamsSchema.parse({ rentalId });
	const path = getRentalDetailContract.path.replace(
		":rentalId",
		encodeURIComponent(parsedParams.rentalId),
	);

	const response = await apiFetch(path, {
		method: getRentalDetailContract.method,
	});

	return GetRentalDetailResponseSchema.parse(response);
}
