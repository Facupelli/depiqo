import { createFileRoute } from "@tanstack/react-router";
import { sitemapResponse } from "@/modules/marketing/marketing-indexing.server";
import { normalizeRequestHostname } from "@/modules/tenant-management/resolve-public-tenant-context/hostname";

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: ({ request }) => {
				const host = normalizeRequestHostname(request.headers.get("host"));
				return sitemapResponse(host.success ? host.hostname : "");
			},
		},
	},
});
