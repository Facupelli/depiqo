import { createFileRoute } from "@tanstack/react-router";
import { proxyPublicSigningBrowserBffRequest } from "@/shared/server/public-signing-browser-bff/public-signing-browser-bff-proxy.server";

export const Route = createFileRoute("/public-signing/$")({
	server: {
		handlers: {
			ANY: ({ request, params }) =>
				proxyPublicSigningBrowserBffRequest(request, params._splat ?? ""),
		},
	},
});
