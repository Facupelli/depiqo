import {
	type CreateRatePlanBodyDto,
	CreateRatePlanBodySchema,
	type CreateRatePlanResponseDto,
	CreateRatePlanResponseSchema,
	createRatePlanContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export type CreateRatePlanVariables = {
	body: CreateRatePlanBodyDto;
};

export async function createRatePlan({
	body,
}: CreateRatePlanVariables): Promise<CreateRatePlanResponseDto> {
	const parsedBody = CreateRatePlanBodySchema.parse(body);

	const response = await apiFetch(createRatePlanContract.path, {
		method: createRatePlanContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return CreateRatePlanResponseSchema.parse(response);
}
