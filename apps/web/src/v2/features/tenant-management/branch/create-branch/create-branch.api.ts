import {
	type CreateBranchBodyDto,
	CreateBranchBodySchema,
	type CreateBranchResponseDto,
	CreateBranchResponseSchema,
	createBranchContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export type CreateBranchVariables = {
	body: CreateBranchBodyDto;
};

export async function createBranch({
	body,
}: CreateBranchVariables): Promise<CreateBranchResponseDto> {
	const parsedBody = CreateBranchBodySchema.parse(body);

	const response = await apiFetch(createBranchContract.path, {
		method: createBranchContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return CreateBranchResponseSchema.parse(response);
}
