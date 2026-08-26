// "" → null  (create: explicit absence, store nothing)
export function emptyToNull(value: string): string | null {
	return value.trim() === "" ? null : value.trim();
}
