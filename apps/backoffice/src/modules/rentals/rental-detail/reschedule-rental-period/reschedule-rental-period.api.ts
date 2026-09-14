import {
	type RescheduleConfirmedRentalPeriodBodyDto,
	RescheduleConfirmedRentalPeriodBodySchema,
	RescheduleConfirmedRentalPeriodParamsSchema,
	type RescheduleConfirmedRentalPeriodResponseDto,
	RescheduleConfirmedRentalPeriodResponseSchema,
	rescheduleConfirmedRentalPeriodContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export interface RescheduleRentalPeriodVariables {
	rentalId: string;
	body: RescheduleConfirmedRentalPeriodBodyDto;
}

export async function rescheduleRentalPeriod({
	rentalId,
	body,
}: RescheduleRentalPeriodVariables): Promise<RescheduleConfirmedRentalPeriodResponseDto> {
	const params = RescheduleConfirmedRentalPeriodParamsSchema.parse({
		rentalId,
	});
	const parsedBody = RescheduleConfirmedRentalPeriodBodySchema.parse(body);
	const path = rescheduleConfirmedRentalPeriodContract.path.replace(
		":rentalId",
		encodeURIComponent(params.rentalId),
	);
	const response = await apiFetch(path, {
		method: rescheduleConfirmedRentalPeriodContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return RescheduleConfirmedRentalPeriodResponseSchema.parse(response);
}
