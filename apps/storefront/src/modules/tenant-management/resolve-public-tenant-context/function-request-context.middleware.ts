import { createMiddleware } from "@tanstack/react-start";
import {
	getRequestHeader,
	setResponseHeader,
} from "@tanstack/react-start/server";
import { normalizeRequestHostname } from "./hostname";
import type { StorefrontRequestContext } from "./request-context.middleware";

const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

// See @/shared/server/storefront-transport/README.md for the request-context boundary.
export const storefrontFunctionRequestContextMiddleware = createMiddleware({
	type: "function",
}).server(async ({ next }) => {
	const hostnameResult = normalizeRequestHostname(
		getRequestHeader("host") ?? null,
	);

	if (!hostnameResult.success) {
		throw new Error("Storefront request Host header is unavailable");
	}

	const incomingRequestId = getRequestHeader(REQUEST_ID_HEADER);
	const requestId =
		incomingRequestId && REQUEST_ID_PATTERN.test(incomingRequestId)
			? incomingRequestId
			: crypto.randomUUID();

	setResponseHeader(REQUEST_ID_HEADER, requestId);

	return next({
		context: {
			storefrontRequest: {
				hostname: hostnameResult.hostname,
				requestId,
			} satisfies StorefrontRequestContext,
		},
	});
});
