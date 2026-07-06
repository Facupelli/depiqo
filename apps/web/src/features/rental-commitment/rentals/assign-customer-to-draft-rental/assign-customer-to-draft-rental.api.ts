import {
	type AssignCustomerToDraftRentalBodyDto,
	AssignCustomerToDraftRentalBodySchema,
	type AssignCustomerToDraftRentalParamsDto,
	AssignCustomerToDraftRentalParamsSchema,
	type AssignCustomerToDraftRentalResponseDto,
	AssignCustomerToDraftRentalResponseSchema,
	assignCustomerToDraftRentalContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type AssignCustomerToDraftRentalVariables = {
	rentalId: AssignCustomerToDraftRentalParamsDto["rentalId"];
	body: AssignCustomerToDraftRentalBodyDto;
};

export async function assignCustomerToDraftRental({
	rentalId,
	body,
}: AssignCustomerToDraftRentalVariables): Promise<AssignCustomerToDraftRentalResponseDto> {
	const parsedParams = AssignCustomerToDraftRentalParamsSchema.parse({
		rentalId,
	});
	const parsedBody = AssignCustomerToDraftRentalBodySchema.parse(body);
	const path = assignCustomerToDraftRentalContract.path.replace(
		":rentalId",
		encodeURIComponent(parsedParams.rentalId),
	);

	await apiFetch(path, {
		method: assignCustomerToDraftRentalContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return AssignCustomerToDraftRentalResponseSchema.parse(undefined);
}
