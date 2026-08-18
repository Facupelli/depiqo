import {
	type AssignRentalAccessoriesBodyDto,
	AssignRentalAccessoriesBodySchema,
	type AssignRentalAccessoriesParamsDto,
	AssignRentalAccessoriesParamsSchema,
	type AssignRentalAccessoriesResponseDto,
	AssignRentalAccessoriesResponseSchema,
	assignRentalAccessoriesContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type AssignRentalAccessoriesVariables = {
	rentalId: AssignRentalAccessoriesParamsDto["rentalId"];
	body: AssignRentalAccessoriesBodyDto;
};

export async function assignRentalAccessories({
	rentalId,
	body,
}: AssignRentalAccessoriesVariables): Promise<AssignRentalAccessoriesResponseDto> {
	const parsedParams = AssignRentalAccessoriesParamsSchema.parse({ rentalId });
	const parsedBody = AssignRentalAccessoriesBodySchema.parse(body);
	const path = assignRentalAccessoriesContract.path.replace(
		":rentalId",
		encodeURIComponent(parsedParams.rentalId),
	);

	await apiFetch(path, {
		method: assignRentalAccessoriesContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return AssignRentalAccessoriesResponseSchema.parse(undefined);
}
