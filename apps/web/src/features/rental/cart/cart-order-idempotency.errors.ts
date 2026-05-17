import { ProblemDetailsError } from "@/shared/errors";

const CREATE_ORDER_IDEMPOTENCY_IN_PROGRESS_TYPE =
	"errors://idempotency-key-in-progress";
const CREATE_ORDER_IDEMPOTENCY_CONFLICT_TYPE =
	"errors://idempotency-key-conflict";

export function isRetryableCreateOrderInProgressError(error: unknown): boolean {
	return (
		error instanceof ProblemDetailsError &&
		error.problemDetails.type === CREATE_ORDER_IDEMPOTENCY_IN_PROGRESS_TYPE &&
		error.problemDetails.retryable === true
	);
}

export function isCreateOrderIdempotencyConflictError(error: unknown): boolean {
	return (
		error instanceof ProblemDetailsError &&
		error.problemDetails.type === CREATE_ORDER_IDEMPOTENCY_CONFLICT_TYPE
	);
}
