import { createFileRoute } from "@tanstack/react-router";
import { proxyBackendRequest } from "@/lib/api/backend-proxy.server";

export const Route = createFileRoute("/backend/$")({
	server: {
		handlers: {
			ANY: ({ request, params }) => {
				return proxyBackendRequest(request, params._splat ?? "");
			},
		},
	},
});
