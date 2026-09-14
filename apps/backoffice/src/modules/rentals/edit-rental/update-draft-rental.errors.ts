import { getProblemDetailsCode } from "@/shared/errors";

export type UpdateDraftRentalErrorKind =
	| "VERSION_CONFLICT"
	| "STATUS_CONFLICT"
	| "OTHER";

export function classifyUpdateDraftRentalError(
	error: unknown,
): UpdateDraftRentalErrorKind {
	const code = getProblemDetailsCode(error);

	if (code === "rental_commitment.rental_version_conflict") {
		return "VERSION_CONFLICT";
	}

	if (code === "rental_commitment.rental_cannot_be_edited_from_status") {
		return "STATUS_CONFLICT";
	}

	return "OTHER";
}
