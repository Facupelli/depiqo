import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	beforeLoad: ({ context }) => {
		if (context.user?.actorType !== "TENANT_USER") {
			throw redirect({ to: "/login" });
		}

		throw redirect({
			to: context.user.mustChangePassword ? "/change-password" : "/dashboard",
		});
	},
});
