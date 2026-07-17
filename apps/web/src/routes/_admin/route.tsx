import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin")({
	beforeLoad: ({ context }) => {
		if (context.tenantContext.face !== "admin") {
			throw notFound();
		}
	},
});
