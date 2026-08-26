import { createFileRoute } from "@tanstack/react-router";
import { proxySessionBrowserBffRequest } from "@/shared/server/session-browser-bff/session-browser-bff-proxy.server";

export const Route = createFileRoute("/session/$")({
	server: {
		handlers: {
			ANY: ({ request, params }) =>
				proxySessionBrowserBffRequest(request, params._splat ?? ""),
		},
	},
});
