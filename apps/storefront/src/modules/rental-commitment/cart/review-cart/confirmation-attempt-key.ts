const STORAGE_KEY = "rental-confirmation-attempt-key";

/**
 * Identity of one logical confirmation attempt. Persisted in sessionStorage so
 * a retry after a lost response or a page refresh reuses the same idempotency
 * key and resolves to the already-created rental instead of creating another.
 *
 * The key is cleared once confirmation succeeds. It is intentionally not tied
 * to cart contents: if the user later confirms materially different input with
 * a stale key, the backend rejects the request with an idempotency conflict.
 */
export function ensureConfirmationAttemptKey(): string {
	const existing = sessionStorage.getItem(STORAGE_KEY);
	if (existing) {
		return existing;
	}

	const key = crypto.randomUUID();
	sessionStorage.setItem(STORAGE_KEY, key);
	return key;
}

export function clearConfirmationAttemptKey(): void {
	sessionStorage.removeItem(STORAGE_KEY);
}
