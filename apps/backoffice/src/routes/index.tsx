import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	beforeLoad: ({ context }) => {
		throw redirect({
			to: context.user?.actorType === "TENANT_USER" ? "/dashboard" : "/login",
		});
	},
});
