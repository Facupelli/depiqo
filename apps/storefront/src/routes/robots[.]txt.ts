import { createFileRoute } from "@tanstack/react-router";
import { robotsResponse } from "@/modules/marketing/marketing-indexing.server";
import { normalizeRequestHostname } from "@/modules/tenant-management/resolve-public-tenant-context/hostname";

export const Route = createFileRoute("/robots.txt")({
	server: {
		handlers: {
			GET: ({ request }) => {
				const host = normalizeRequestHostname(request.headers.get("host"));
				return robotsResponse(host.success ? host.hostname : "");
			},
		},
	},
});
