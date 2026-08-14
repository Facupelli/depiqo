import { createFileRoute } from "@tanstack/react-router";
import { redirectToGoogleAuthorization } from "@/modules/tenant-management/auth/customer-google/central-google-oauth.server";

export const Route = createFileRoute("/auth/google/start")({
	server: {
		handlers: {
			GET: ({ request }) => redirectToGoogleAuthorization(request),
		},
	},
});
