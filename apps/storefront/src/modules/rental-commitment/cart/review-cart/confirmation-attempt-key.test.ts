import { beforeEach, describe, expect, it } from "vitest";
import {
	clearConfirmationAttemptKey,
	ensureConfirmationAttemptKey,
} from "./confirmation-attempt-key";

const storage = new Map<string, string>();

beforeEach(() => {
	storage.clear();
	globalThis.sessionStorage = {
		getItem: (key: string) => storage.get(key) ?? null,
		setItem: (key: string, value: string) => void storage.set(key, value),
		removeItem: (key: string) => void storage.delete(key),
		clear: () => storage.clear(),
	} as Storage;
});

describe("confirmation attempt key", () => {
	it("creates and persists a UUID for a new attempt", () => {
		const key = ensureConfirmationAttemptKey();

		expect(key).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		);
		expect(storage.get("rental-confirmation-attempt-key")).toBe(key);
	});

	it("reuses the persisted key across retries", () => {
		const first = ensureConfirmationAttemptKey();
		const second = ensureConfirmationAttemptKey();

		expect(second).toBe(first);
	});

	it("clears the key after confirmed success so a new attempt gets a fresh key", () => {
		const first = ensureConfirmationAttemptKey();
		clearConfirmationAttemptKey();

		expect(storage.has("rental-confirmation-attempt-key")).toBe(false);
		const second = ensureConfirmationAttemptKey();
		expect(second).not.toBe(first);
	});
});
