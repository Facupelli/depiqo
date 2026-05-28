import {
	GetRentalAccessoryDefaultsParamsSchema,
	type GetRentalAccessoryDefaultsResponseDto,
	GetRentalAccessoryDefaultsResponseSchema,
	getRentalAccessoryDefaultsContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export async function getRentalAccessoryDefaults(
	rentalId: string,
): Promise<GetRentalAccessoryDefaultsResponseDto> {
	const parsedParams = GetRentalAccessoryDefaultsParamsSchema.parse({
		rentalId,
	});
	const path = getRentalAccessoryDefaultsContract.path.replace(
		":rentalId",
		encodeURIComponent(parsedParams.rentalId),
	);

	const response = await apiFetch(path, {
		method: getRentalAccessoryDefaultsContract.method,
	});

	return GetRentalAccessoryDefaultsResponseSchema.parse(response);
}
