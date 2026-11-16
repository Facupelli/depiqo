import { TenantPermission } from "@repo/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import { can, requireRouteAccess } from "@/auth/permissions";
import { CreateRentalPage } from "@/modules/rentals/create-rental/CreateRentalPage";
import { branchQueries } from "@/modules/settings/branches/public";

export const Route = createFileRoute("/_admin/dashboard/orders/new")({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			can(context.user.permissions, TenantPermission.RentalsProposalsManage),
		);
	},
	loader: ({ context: { queryClient } }) =>
		queryClient.prefetchQuery(branchQueries.list()),
	component: CreateRentalPage,
});
