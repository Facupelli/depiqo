import {
	type AuthRedirectSearch,
	authRedirectSearchSchema,
	normalizeSafeRedirectTo,
	toAuthRedirectSearch,
} from "./auth-redirect";

export const PORTAL_AUTH_REDIRECT_FALLBACK = "/rental";

export const portalAuthRedirectSchema = authRedirectSearchSchema;

export type PortalAuthRedirect = AuthRedirectSearch;

export function getPortalAuthRedirectTarget(search: PortalAuthRedirect) {
	return {
		href: normalizeSafeRedirectTo(
			search.redirectTo,
			PORTAL_AUTH_REDIRECT_FALLBACK,
		),
	};
}

export function getPortalAuthRedirectSearch(redirectTo?: string) {
	return toAuthRedirectSearch(redirectTo, PORTAL_AUTH_REDIRECT_FALLBACK);
}
