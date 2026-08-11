import type { ProblemDetailsError } from "@/shared/errors";

const PROBLEM_TYPE_BASE_URL = "https://api.depiqo.com/problems";
const INSUFFICIENT_ASSET_AVAILABILITY_TYPE = `${PROBLEM_TYPE_BASE_URL}/rental-commitment/insufficient-asset-availability`;
const UNSUPPORTED_BRANCH_FULFILLMENT_METHOD_TYPE = `${PROBLEM_TYPE_BASE_URL}/rental-commitment/unsupported-branch-fulfillment-method`;
const UNAUTHORIZED_TYPE = `${PROBLEM_TYPE_BASE_URL}/auth/unauthorized`;
const IDEMPOTENCY_IN_PROGRESS_TYPE = "errors://idempotency-key-in-progress";
const IDEMPOTENCY_CONFLICT_TYPE = "errors://idempotency-key-conflict";

export type ConfirmedRentalErrorKind =
	| "AVAILABILITY_CONFLICT"
	| "DELIVERY_NOT_SUPPORTED"
	| "UNAUTHENTICATED"
	| "IDEMPOTENCY_IN_PROGRESS"
	| "IDEMPOTENCY_CONFLICT"
	| "OTHER";

export function classifyConfirmedRentalError(
	error: ProblemDetailsError,
): ConfirmedRentalErrorKind {
	switch (error.problemDetails.type) {
		case INSUFFICIENT_ASSET_AVAILABILITY_TYPE:
			return "AVAILABILITY_CONFLICT";
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
