const STORAGE_KEY = "rental-confirmation-attempt-key";

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
