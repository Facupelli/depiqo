import { isRetryableCreateOrderInProgressError } from "./cart-order-idempotency.errors";

const CREATE_ORDER_IN_PROGRESS_RETRY_ATTEMPTS = 3;
const CREATE_ORDER_IN_PROGRESS_RETRY_DELAY_MS = 500;

export async function retryCreateOrderWhenInProgress<T>(
	operation: () => Promise<T>,
): Promise<T> {
	let lastError: unknown;

	for (
		let attempt = 1;
		attempt <= CREATE_ORDER_IN_PROGRESS_RETRY_ATTEMPTS;
		attempt += 1
	) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;

			if (
				!isRetryableCreateOrderInProgressError(error) ||
				attempt === CREATE_ORDER_IN_PROGRESS_RETRY_ATTEMPTS
			) {
				throw error;
			}

			await wait(CREATE_ORDER_IN_PROGRESS_RETRY_DELAY_MS);
		}
	}

	throw lastError;
}

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
