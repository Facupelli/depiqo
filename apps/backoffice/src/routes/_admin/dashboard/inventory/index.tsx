import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/dashboard/inventory/")({
	beforeLoad: () => {
		throw redirect({
			to: "/dashboard/inventory/equipment-types",
			replace: true,
		});
	},
});
