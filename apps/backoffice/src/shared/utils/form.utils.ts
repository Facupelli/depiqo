export function emptyToNull(value: string): string | null {
	return value.trim() === "" ? null : value.trim();
}
