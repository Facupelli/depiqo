import { createMiddleware } from "@tanstack/react-start";
import { logStorefrontServerEvent } from "@/shared/server/logging/storefront-server-logger.server";
import { normalizeRequestHostname } from "./hostname";

const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export type StorefrontRequestContext = {
	hostname: string;
	requestId: string;
};

export const storefrontRequestContextMiddleware = createMiddleware().server(
	async ({ next, request }) => {
		const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER));
		const hostnameResult = normalizeRequestHostname(
			request.headers.get("host"),
		);

		if (!hostnameResult.success) {
			logStorefrontServerEvent({
				event: "storefront.request.rejected",
				requestId,
				status: 400,
				reason: hostnameResult.reason,
			});

			return Response.json(
				{
					type: "about:blank",
					title: "Bad Request",
					status: 400,
					detail: "The request Host header is missing or malformed.",
					requestId,
				},
				{
					status: 400,
					headers: {
						"cache-control": "no-store",
						[REQUEST_ID_HEADER]: requestId,
					},
				},
			);
		}

		const response = await next({
			context: {
				storefrontRequest: {
					hostname: hostnameResult.hostname,
					requestId,
				} satisfies StorefrontRequestContext,
			},
		});

		response.response.headers.set(REQUEST_ID_HEADER, requestId);
		return response;
	},
);

function resolveRequestId(value: string | null): string {
	return value && REQUEST_ID_PATTERN.test(value) ? value : crypto.randomUUID();
}
