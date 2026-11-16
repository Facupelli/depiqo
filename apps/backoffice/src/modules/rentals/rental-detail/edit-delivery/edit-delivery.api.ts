import {
	type ChangeConfirmedRentalDeliveryBodyDto,
	ChangeConfirmedRentalDeliveryBodySchema,
	type ChangeConfirmedRentalDeliveryParamsDto,
	ChangeConfirmedRentalDeliveryParamsSchema,
	ChangeConfirmedRentalDeliveryResponseSchema,
	changeConfirmedRentalDeliveryContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type EditDeliveryVariables = ChangeConfirmedRentalDeliveryParamsDto &
	ChangeConfirmedRentalDeliveryBodyDto;

export async function editDelivery({
	rentalId,
	...body
}: EditDeliveryVariables) {
	const params = ChangeConfirmedRentalDeliveryParamsSchema.parse({ rentalId });
	const parsed = ChangeConfirmedRentalDeliveryBodySchema.parse(body);
	const response = await apiFetch(
		changeConfirmedRentalDeliveryContract.path.replace(
			":rentalId",
			encodeURIComponent(params.rentalId),
		),
		{
			method: changeConfirmedRentalDeliveryContract.method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(parsed),
		},
	);
	return ChangeConfirmedRentalDeliveryResponseSchema.parse(response);
}
