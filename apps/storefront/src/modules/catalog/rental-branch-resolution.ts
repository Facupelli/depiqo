import type { GetStorefrontBranchDto } from "@repo/api-contracts";

export type RentalBranchResolution =
	| { kind: "catalog"; branchId: string }
	| { kind: "redirect"; branchId: string }
	| { kind: "selection"; invalidBranchRequested: boolean }
	| { kind: "no-branches" };

export function resolveRentalBranch(
	requestedBranchId: string | undefined,
	branches: GetStorefrontBranchDto[],
): RentalBranchResolution {
	const requestedBranch = branches.find(
		(branch) => branch.id === requestedBranchId,
	);

	if (requestedBranch) {
		return { kind: "catalog", branchId: requestedBranch.id };
	}

	if (branches.length === 1) {
		return { kind: "redirect", branchId: branches[0].id };
	}

	if (branches.length === 0) {
		return { kind: "no-branches" };
	}

	return {
		kind: "selection",
		invalidBranchRequested: requestedBranchId !== undefined,
	};
}
