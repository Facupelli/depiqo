import {
	type ChangeConfirmedRentalDeliveryAgreementBodyDto,
	ChangeConfirmedRentalDeliveryAgreementBodySchema,
	type ChangeConfirmedRentalDeliveryAgreementParamsDto,
	ChangeConfirmedRentalDeliveryAgreementParamsSchema,
	ChangeConfirmedRentalDeliveryAgreementResponseSchema,
	changeConfirmedRentalDeliveryAgreementContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type EditDeliveryAgreementVariables =
	ChangeConfirmedRentalDeliveryAgreementParamsDto &
		ChangeConfirmedRentalDeliveryAgreementBodyDto;

export async function editDeliveryAgreement({
	rentalId,
	...body
}: EditDeliveryAgreementVariables) {
	const params = ChangeConfirmedRentalDeliveryAgreementParamsSchema.parse({
		rentalId,
	});
	const parsedBody =
		ChangeConfirmedRentalDeliveryAgreementBodySchema.parse(body);
	const response = await apiFetch(
		changeConfirmedRentalDeliveryAgreementContract.path.replace(
			":rentalId",
			encodeURIComponent(params.rentalId),
		),
		{
			method: changeConfirmedRentalDeliveryAgreementContract.method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(parsedBody),
		},
	);
	return ChangeConfirmedRentalDeliveryAgreementResponseSchema.parse(response);
}
