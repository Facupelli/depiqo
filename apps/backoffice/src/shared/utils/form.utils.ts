// "" → null  (create: explicit absence, store nothing)
export function emptyToNull(value: string): string | null {
	return value.trim() === "" ? null : value.trim();
}

// "" → null, but undefined means "field was not touched" (PATCH no-op)
// Only call this on fields the user actually interacted with.
export function emptyToNullOrUndefined(
	value: string | undefined,
): string | null | undefined {
	if (value === undefined) {
		return undefined;
	}
	return value.trim() === "" ? null : value.trim();
}
