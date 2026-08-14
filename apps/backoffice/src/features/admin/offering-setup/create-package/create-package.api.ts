import {
	type CreatePackageBodyDto,
	CreatePackageBodySchema,
	type CreatePackageResponseDto,
	CreatePackageResponseSchema,
	createPackageContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function createPackage(
	body: CreatePackageBodyDto,
): Promise<CreatePackageResponseDto> {
	const parsedBody = CreatePackageBodySchema.parse(body);

	const response = await apiFetch(createPackageContract.path, {
		method: createPackageContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return CreatePackageResponseSchema.parse(response);
}
