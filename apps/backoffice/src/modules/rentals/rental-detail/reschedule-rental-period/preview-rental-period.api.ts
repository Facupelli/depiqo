import {
	type PreviewConfirmedRentalPeriodBodyDto,
	type PreviewConfirmedRentalPeriodResponseDto,
	previewConfirmedRentalPeriodContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export interface PreviewRentalPeriodVariables {
	rentalId: string;
	body: PreviewConfirmedRentalPeriodBodyDto;
}

export async function previewRentalPeriod({
	rentalId,
	body,
}: PreviewRentalPeriodVariables): Promise<PreviewConfirmedRentalPeriodResponseDto> {
	const contract = previewConfirmedRentalPeriodContract;
	const params = contract.params.parse({ rentalId });
	const response = await apiFetch(
		contract.path.replace(":rentalId", encodeURIComponent(params.rentalId)),
		{
			method: contract.method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(contract.body.parse(body)),
		},
	);
	const preview = contract.response.parse(response);
	if (
		preview.rentalId !== params.rentalId ||
		preview.expectedVersion !== body.expectedVersion ||
		new Date(preview.period.start).getTime() !==
			new Date(body.period.start).getTime() ||
		new Date(preview.period.end).getTime() !==
			new Date(body.period.end).getTime()
	) {
		throw new Error(
			"The delivery preview does not match the requested period/version.",
		);
	}
	return preview;
}
