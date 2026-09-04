import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

const branchAddressErrorMessages: Record<string, string> = {
	"tenant_management.branch_address_unresolved":
		"No pudimos encontrar esa dirección. Revisala e intentá nuevamente.",
};

export function getBranchSaveErrorMessage(
	error: unknown,
	fallback: string,
): string {
	const code = getProblemDetailsCode(error);
	if (code && branchAddressErrorMessages[code]) {
		return branchAddressErrorMessages[code];
	}

	if (error instanceof ProblemDetailsError) {
		return (
			error.problemDetails.detail ?? error.problemDetails.title ?? fallback
		);
	}

	return fallback;
}
