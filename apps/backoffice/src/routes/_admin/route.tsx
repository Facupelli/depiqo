import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin")({
	beforeLoad: ({ context, location }) => {
		const redirectTo = `${location.pathname}${location.searchStr ?? ""}${location.hash ?? ""}`;

		if (!context.user) {
			throw redirect({
				to: "/login",
				search: { redirectTo },
			});
		}

		if (context.user.actorType !== "TENANT_USER") {
			throw notFound();
		}

		return {
			user: context.user,
		};
	},
});
