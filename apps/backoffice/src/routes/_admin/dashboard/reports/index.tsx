import { TenantPermission } from "@repo/api-contracts";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { can } from "@/auth/permissions";

export const Route = createFileRoute("/_admin/dashboard/reports/")({
	beforeLoad: ({ context }) => {
		throw redirect({
			to: can(context.user.permissions, TenantPermission.ReportsRentalsRead)
				? "/dashboard/reports/rentals"
				: "/dashboard/reports/equipment",
		});
	},
});
