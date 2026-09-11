import {
	type ReplaceRentalDemandLineAccessoriesBodyDto,
	ReplaceRentalDemandLineAccessoriesBodySchema,
	ReplaceRentalDemandLineAccessoriesParamsSchema,
	type ReplaceRentalDemandLineAccessoriesResponseDto,
	ReplaceRentalDemandLineAccessoriesResponseSchema,
	replaceRentalDemandLineAccessoriesContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type ReplaceRentalDemandLineAccessoriesVariables = {
	rentalId: string;
	rentalDemandLineId: string;
	body: ReplaceRentalDemandLineAccessoriesBodyDto;
};

export async function replaceRentalDemandLineAccessories({
	rentalId,
	rentalDemandLineId,
	body,
}: ReplaceRentalDemandLineAccessoriesVariables): Promise<ReplaceRentalDemandLineAccessoriesResponseDto> {
	const params = ReplaceRentalDemandLineAccessoriesParamsSchema.parse({
		rentalId,
		rentalDemandLineId,
	});
	const parsedBody = ReplaceRentalDemandLineAccessoriesBodySchema.parse(body);
	const path = replaceRentalDemandLineAccessoriesContract.path
		.replace(":rentalId", encodeURIComponent(params.rentalId))
		.replace(
			":rentalDemandLineId",
			encodeURIComponent(params.rentalDemandLineId),
		);

	await apiFetch(path, {
		method: replaceRentalDemandLineAccessoriesContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return ReplaceRentalDemandLineAccessoriesResponseSchema.parse(undefined);
}
