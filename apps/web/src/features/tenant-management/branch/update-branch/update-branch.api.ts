import {
	type UpdateBranchBodyDto,
	UpdateBranchBodySchema,
	type UpdateBranchParamsDto,
	UpdateBranchParamsSchema,
	type UpdateBranchResponseDto,
	UpdateBranchResponseSchema,
	updateBranchContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type UpdateBranchVariables = {
	params: UpdateBranchParamsDto;
	body: UpdateBranchBodyDto;
};

export async function updateBranch({
	params,
	body,
}: UpdateBranchVariables): Promise<UpdateBranchResponseDto> {
	const parsedParams = UpdateBranchParamsSchema.parse(params);
	const parsedBody = UpdateBranchBodySchema.parse(body);
	const path = updateBranchContract.path.replace(
		":branchId",
		encodeURIComponent(parsedParams.branchId),
	);

	const response = await apiFetch(path, {
		method: updateBranchContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return UpdateBranchResponseSchema.parse(response);
}
