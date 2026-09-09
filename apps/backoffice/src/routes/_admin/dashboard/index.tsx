import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/dashboard/")({
	beforeLoad: () => {
		throw redirect({ to: "/dashboard/calendar" });
	},
});
