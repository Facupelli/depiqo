import {
	type BranchRentalAssetBufferDto,
	getBranchRentalAssetBufferContract,
	putBranchRentalAssetBufferContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export async function getRentalAssetBuffer(branchId: string) {
	const { method, path, params, response } = getBranchRentalAssetBufferContract;
	const branch = params.parse({ branchId });
	return response.parse(
		await apiFetch(
			path.replace(":branchId", encodeURIComponent(branch.branchId)),
			{
				method,
			},
		),
	);
}

export async function putRentalAssetBuffer({
	branchId,
	buffer,
}: {
	branchId: string;
	buffer: BranchRentalAssetBufferDto;
}) {
	const { method, path, params, body, response } =
		putBranchRentalAssetBufferContract;
	const branch = params.parse({ branchId });
	return response.parse(
		await apiFetch(
			path.replace(":branchId", encodeURIComponent(branch.branchId)),
			{
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body.parse(buffer)),
			},
		),
	);
}
