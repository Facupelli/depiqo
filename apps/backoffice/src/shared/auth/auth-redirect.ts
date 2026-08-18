import { z } from "zod";

export const authRedirectSearchSchema = z.object({
	redirectTo: z.string().optional(),
});

export function isSafeRelativeRedirect(redirectTo: string): boolean {
	if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
		return false;
	}

	return true;
}

export function normalizeSafeRedirectTo(
	redirectTo: string | undefined,
	fallbackTo: string,
): string {
	if (!redirectTo) {
		return fallbackTo;
	}

	try {
		if (redirectTo.startsWith("http://") || redirectTo.startsWith("https://")) {
			return fallbackTo;
		}

		const normalized = redirectTo;

		return isSafeRelativeRedirect(normalized) ? normalized : fallbackTo;
	} catch {
		return fallbackTo;
	}
}
