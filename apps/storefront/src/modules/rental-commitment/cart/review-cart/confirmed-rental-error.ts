import type { ProblemDetailsError } from "@/shared/errors";

const PROBLEM_TYPE_BASE_URL = "https://api.depiqo.com/problems";
const INSUFFICIENT_ASSET_AVAILABILITY_TYPE = `${PROBLEM_TYPE_BASE_URL}/rental_commitment.insufficient_asset_availability`;
const INSUFFICIENT_ASSET_AVAILABILITY_CODE =
	"rental_commitment.insufficient_asset_availability";
const CATALOG_SELECTION_UNAVAILABLE_TYPE = `${PROBLEM_TYPE_BASE_URL}/rental_commitment.catalog_selection_unavailable`;
const CATALOG_SELECTION_UNAVAILABLE_CODE =
	"rental_commitment.catalog_selection_unavailable";
const UNAUTHORIZED_TYPE = `${PROBLEM_TYPE_BASE_URL}/auth/unauthorized`;
const IDEMPOTENCY_KEY_CONFLICT_TYPE = `${PROBLEM_TYPE_BASE_URL}/rental_commitment.idempotency_key_reused_with_different_input`;
const IDEMPOTENCY_KEY_CONFLICT_CODE =
	"rental_commitment.idempotency_key_reused_with_different_input";

export type ConfirmedRentalErrorKind =
	| "AVAILABILITY_CONFLICT"
	| "CATALOG_SELECTION_UNAVAILABLE"
	| "UNAUTHENTICATED"
	| "IDEMPOTENCY_CONFLICT"
	| "OTHER";

export function classifyConfirmedRentalError(
	error: ProblemDetailsError,
): ConfirmedRentalErrorKind {
	if (
		error.problemDetails.type === INSUFFICIENT_ASSET_AVAILABILITY_TYPE ||
		error.problemDetails.code === INSUFFICIENT_ASSET_AVAILABILITY_CODE
	) {
		return "AVAILABILITY_CONFLICT";
	}

	if (
		error.problemDetails.type === CATALOG_SELECTION_UNAVAILABLE_TYPE ||
		error.problemDetails.code === CATALOG_SELECTION_UNAVAILABLE_CODE
	) {
		return "CATALOG_SELECTION_UNAVAILABLE";
	}

	if (
		error.problemDetails.type === IDEMPOTENCY_KEY_CONFLICT_TYPE ||
		error.problemDetails.code === IDEMPOTENCY_KEY_CONFLICT_CODE
	) {
		return "IDEMPOTENCY_CONFLICT";
	}

	switch (error.problemDetails.type) {
		case UNAUTHORIZED_TYPE:
			return "UNAUTHENTICATED";
		default:
			return "OTHER";
	}
}

export function getUnavailableRentalOfferIds(
	error: ProblemDetailsError,
): string[] {
	const kind = classifyConfirmedRentalError(error);
	if (
		kind !== "AVAILABILITY_CONFLICT" &&
		kind !== "CATALOG_SELECTION_UNAVAILABLE"
	) {
		return [];
	}

	return typeof error.problemDetails.rentalOfferId === "string"
		? [error.problemDetails.rentalOfferId]
		: [];
}
