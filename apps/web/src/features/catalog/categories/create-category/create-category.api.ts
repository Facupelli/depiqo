import {
	type CreateCategoryBodyDto,
	CreateCategoryBodySchema,
	type CreateCategoryResponseDto,
	CreateCategoryResponseSchema,
	createCategoryContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type CreateCategoryVariables = {
	body: CreateCategoryBodyDto;
};

export async function createCategory({
	body,
}: CreateCategoryVariables): Promise<CreateCategoryResponseDto> {
	const parsedBody = CreateCategoryBodySchema.parse(body);

	const response = await apiFetch(createCategoryContract.path, {
		method: createCategoryContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return CreateCategoryResponseSchema.parse(response);
}
