import { createMiddleware } from "@tanstack/react-start";
import { normalizeRequestHostname } from "@/modules/tenant-management/resolve-public-tenant-context/hostname";
import { marketingRedirect, shouldNoindex } from "./marketing-indexing.server";

export const marketingIndexingMiddleware = createMiddleware().server(
	async ({ request, next }) => {
		const host = normalizeRequestHostname(request.headers.get("host"));
		if (!host.success) return next();

		const url = new URL(request.url);
		url.hostname = host.hostname;
		const redirect = marketingRedirect(url);
		if (redirect) return redirect;

		const result = await next();
		if (shouldNoindex(host.hostname, url.pathname)) {
			result.response.headers.set("X-Robots-Tag", "noindex");
		}
		return result;
	},
);
