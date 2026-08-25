import {
	type ChangeRentalDetailsBodyDto,
	ChangeRentalDetailsBodySchema,
	type ChangeRentalDetailsParamsDto,
	ChangeRentalDetailsParamsSchema,
	type ChangeRentalDetailsResponseDto,
	ChangeRentalDetailsResponseSchema,
	changeRentalDetailsContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type ChangeRentalDetailsVariables = ChangeRentalDetailsParamsDto &
	ChangeRentalDetailsBodyDto;

export async function changeRentalDetails({
	rentalId,
	...body
}: ChangeRentalDetailsVariables): Promise<ChangeRentalDetailsResponseDto> {
	const params = ChangeRentalDetailsParamsSchema.parse({ rentalId });
	const parsedBody = ChangeRentalDetailsBodySchema.parse(body);
	const path = changeRentalDetailsContract.path.replace(
		":rentalId",
		encodeURIComponent(params.rentalId),
	);
	const response = await apiFetch(path, {
		method: changeRentalDetailsContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return ChangeRentalDetailsResponseSchema.parse(response);
}
