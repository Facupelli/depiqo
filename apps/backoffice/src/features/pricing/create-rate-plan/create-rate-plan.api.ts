import {
	type CreateRatePlanBodyDto,
	CreateRatePlanBodySchema,
	type CreateRatePlanResponseDto,
	CreateRatePlanResponseSchema,
	createRatePlanContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function createRatePlan(
	body: CreateRatePlanBodyDto,
): Promise<CreateRatePlanResponseDto> {
	const parsedBody = CreateRatePlanBodySchema.parse(body);
	const response = await apiFetch(createRatePlanContract.path, {
		method: createRatePlanContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});

	return CreateRatePlanResponseSchema.parse(response);
}
