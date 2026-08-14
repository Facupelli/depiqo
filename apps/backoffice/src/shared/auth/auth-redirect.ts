import { z } from "zod";

export const authRedirectTargetSchema = z.object({
	to: z.string(),
	search: z.record(z.string(), z.string()).optional(),
});

export type AuthRedirectTarget = z.infer<typeof authRedirectTargetSchema>;

export const authRedirectSearchSchema = z.object({
	redirectTo: z.string().optional(),
});

export type AuthRedirectSearch = z.infer<typeof authRedirectSearchSchema>;

export function normalizeAuthRedirectTarget(
	redirectTo: AuthRedirectTarget | string,
): AuthRedirectTarget {
	return typeof redirectTo === "string" ? { to: redirectTo } : redirectTo;
}

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

export function toAuthRedirectSearch(
	redirectTo: string | undefined,
	fallbackTo: string,
): AuthRedirectSearch {
	return {
		redirectTo: normalizeSafeRedirectTo(redirectTo, fallbackTo),
	};
}

export function getCurrentRelativeRedirect(fallbackTo: string): string {
	if (typeof window === "undefined") {
		return fallbackTo;
	}

	return normalizeSafeRedirectTo(
		`${window.location.pathname}${window.location.search}${window.location.hash}`,
		fallbackTo,
	);
}
