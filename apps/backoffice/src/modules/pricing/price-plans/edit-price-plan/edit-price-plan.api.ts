import {
	type CorrectRatePlanBodyDto,
	CorrectRatePlanBodySchema,
	type CorrectRatePlanResponseDto,
	CorrectRatePlanResponseSchema,
	correctRatePlanContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type EditPricePlanVariables = {
	ratePlanId: string;
	body: CorrectRatePlanBodyDto;
};

export async function editPricePlan({
	ratePlanId,
	body,
}: EditPricePlanVariables): Promise<CorrectRatePlanResponseDto> {
	const parsedBody = CorrectRatePlanBodySchema.parse(body);
	const path = correctRatePlanContract.path.replace(
		":ratePlanId",
		encodeURIComponent(ratePlanId),
	);
	const response = await apiFetch(path, {
		method: correctRatePlanContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return CorrectRatePlanResponseSchema.parse(response);
}
