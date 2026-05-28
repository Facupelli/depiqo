import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

export const getForwardedCookieHeader = createIsomorphicFn()
	.server(() => {
		return getRequestHeader("cookie") ?? null;
	})
	.client(() => {
		return null;
	});

export const getForwardedCsrfHeader = createIsomorphicFn()
	.server(() => {
		return getRequestHeader("x-csrf-token") ?? null;
	})
	.client(() => {
		return null;
	});
