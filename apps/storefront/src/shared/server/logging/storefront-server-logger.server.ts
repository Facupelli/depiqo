import { createServerOnlyFn } from "@tanstack/react-start";

type StorefrontServerLogEvent = {
	event: string;
	requestId: string;
	status: number;
	durationMs?: number;
	hostname?: string;
	face?: "admin" | "platform" | "storefront";
	tenantId?: string;
	tenantSlug?: string;
	method?: string;
	path?: string;
	reason?: string;
};

export const logStorefrontServerEvent = createServerOnlyFn(
	(event: StorefrontServerLogEvent): void => {
		const log = {
			timestamp: new Date().toISOString(),
			service: "storefront",
			...event,
		};

		if (event.status >= 500) {
			console.error(log);
			return;
		}

		if (event.status >= 400) {
			console.warn(log);
			return;
		}

		console.info(log);
	},
);
