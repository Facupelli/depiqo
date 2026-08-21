import type { ProblemDetailsError } from "@/shared/errors";

const PROBLEM_TYPE_BASE_URL = "https://api.depiqo.com/problems";
const INSUFFICIENT_ASSET_AVAILABILITY_TYPE = `${PROBLEM_TYPE_BASE_URL}/rental_commitment.insufficient_asset_availability`;
const INSUFFICIENT_ASSET_AVAILABILITY_CODE =
	"rental_commitment.insufficient_asset_availability";
const CATALOG_SELECTION_UNAVAILABLE_TYPE = `${PROBLEM_TYPE_BASE_URL}/rental_commitment.catalog_selection_unavailable`;
const CATALOG_SELECTION_UNAVAILABLE_CODE =
	"rental_commitment.catalog_selection_unavailable";
const UNSUPPORTED_BRANCH_FULFILLMENT_METHOD_TYPE = `${PROBLEM_TYPE_BASE_URL}/rental-commitment/unsupported-branch-fulfillment-method`;
const UNAUTHORIZED_TYPE = `${PROBLEM_TYPE_BASE_URL}/auth/unauthorized`;
const IDEMPOTENCY_IN_PROGRESS_TYPE = "errors://idempotency-key-in-progress";
const IDEMPOTENCY_CONFLICT_TYPE = "errors://idempotency-key-conflict";

export type ConfirmedRentalErrorKind =
	| "AVAILABILITY_CONFLICT"
	| "CATALOG_SELECTION_UNAVAILABLE"
	| "DELIVERY_NOT_SUPPORTED"
	| "UNAUTHENTICATED"
	| "IDEMPOTENCY_IN_PROGRESS"
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

	switch (error.problemDetails.type) {
		case UNSUPPORTED_BRANCH_FULFILLMENT_METHOD_TYPE:
			return "DELIVERY_NOT_SUPPORTED";
		case UNAUTHORIZED_TYPE:
			return "UNAUTHENTICATED";
		case IDEMPOTENCY_IN_PROGRESS_TYPE:
			return "IDEMPOTENCY_IN_PROGRESS";
		case IDEMPOTENCY_CONFLICT_TYPE:
			return "IDEMPOTENCY_CONFLICT";
		default:
			return "OTHER";
	}
}

export function getUnavailableRentalOfferIds(
	error: ProblemDetailsError,
): string[] {
	const kind = classifyConfirmedRentalError(error);
	if (kind !== "AVAILABILITY_CONFLICT" && kind !== "CATALOG_SELECTION_UNAVAILABLE") {
		return [];
	}

	return typeof error.problemDetails.rentalOfferId === "string"
		? [error.problemDetails.rentalOfferId]
		: [];
}
