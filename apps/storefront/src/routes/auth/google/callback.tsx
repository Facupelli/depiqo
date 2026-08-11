import { createFileRoute } from "@tanstack/react-router";
import { handleGoogleCallback } from "@/modules/tenant-management/auth/customer-google/central-google-oauth.server";

export const Route = createFileRoute("/auth/google/callback")({
	server: {
		handlers: {
			GET: ({ request }) => handleGoogleCallback(request),
		},
	},
});
