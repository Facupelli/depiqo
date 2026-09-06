type ResolveEffectiveBranchIdInput = {
	branches: Array<{ id: string }>;
	branchId?: string;
	branchScope?: "all";
	workingBranchId: string | null;
};

export function resolveEffectiveBranchId({
	branches,
	branchId,
	branchScope,
	workingBranchId,
}: ResolveEffectiveBranchIdInput): string | undefined {
	if (branches.length === 1) {
		return branches[0].id;
	}

	if (branchId !== undefined) {
		return branchId;
	}

	if (branchScope === "all") {
		return undefined;
	}

	return workingBranchId ?? undefined;
}
