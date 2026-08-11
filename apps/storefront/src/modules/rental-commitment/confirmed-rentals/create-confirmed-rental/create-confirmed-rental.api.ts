import {
	type CreateConfirmedRentalBodyDto,
	CreateConfirmedRentalBodySchema,
	type CreateConfirmedRentalResponseDto,
	CreateConfirmedRentalResponseSchema,
	createConfirmedRentalContract,
} from "@repo/api-contracts";
import { getCustomerCsrfToken } from "@/modules/tenant-management/auth/csrf-token";
import { sessionBrowserApiFetch } from "@/modules/tenant-management/auth/session-browser-api";

export type CreateConfirmedRentalVariables = {
	body: CreateConfirmedRentalBodyDto;
};

export async function createConfirmedRental({
	body,
}: CreateConfirmedRentalVariables): Promise<CreateConfirmedRentalResponseDto> {
	const data = await sessionBrowserApiFetch(createConfirmedRentalContract.path, {
		method: createConfirmedRentalContract.method,
		headers: {
			"content-type": "application/json",
			"x-csrf-token": await getCustomerCsrfToken(),
		},
		body: JSON.stringify(CreateConfirmedRentalBodySchema.parse(body)),
	});

	return CreateConfirmedRentalResponseSchema.parse(data);
}
