import {
	type UpdateWorkingBranchBodyDto,
	UpdateWorkingBranchBodySchema,
	type UpdateWorkingBranchResponseDto,
	UpdateWorkingBranchResponseSchema,
	updateWorkingBranchContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function updateWorkingBranch(
	body: UpdateWorkingBranchBodyDto,
): Promise<UpdateWorkingBranchResponseDto> {
	const parsedBody = UpdateWorkingBranchBodySchema.parse(body);
	const response = await apiFetch(updateWorkingBranchContract.path, {
		method: updateWorkingBranchContract.method,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(parsedBody),
	});

	return UpdateWorkingBranchResponseSchema.parse(response);
}
