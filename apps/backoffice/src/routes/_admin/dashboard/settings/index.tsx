import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/dashboard/settings/")({
	beforeLoad: () => {
		throw redirect({
			to: "/dashboard/settings/business",
			replace: true,
		});
	},
});
