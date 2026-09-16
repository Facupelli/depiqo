import { GetRentalsQuerySchema } from "@repo/api-contracts";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";
import { rentalWorkspacePermissions } from "@/auth/capabilities";
import { canAny, requireRouteAccess } from "@/auth/permissions";
import {
	RentalsListPage,
	type RentalsListSearch,
} from "@/modules/rentals/list-rentals/RentalsListPage";
import { AdminRouteError } from "@/shared/components/admin-route-error";

const ordersListSearchSchema = GetRentalsQuerySchema.extend({
	branchScope: z.literal("all").optional(),
});

export type OrdersListSearch = z.infer<typeof ordersListSearchSchema>;

export const Route = createFileRoute("/_admin/dashboard/orders/")({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			canAny(context.user.permissions, rentalWorkspacePermissions),
		);
	},
	validateSearch: ordersListSearchSchema,
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar los pedidos."
				forbiddenMessage="No tienes permisos para ver los pedidos."
			/>
		);
	},
	component: OrdersPage,
});

function OrdersPage() {
	const search = Route.useSearch();
	const { user } = Route.useRouteContext();
	const navigate = useNavigate({ from: Route.fullPath });
	const handleSearchChange = useCallback(
		(updater: (previous: RentalsListSearch) => RentalsListSearch) => {
			navigate({
				to: ".",
				search: updater,
			});
		},
		[navigate],
	);

	return (
		<RentalsListPage
			search={search}
			permissions={user.permissions}
			onSearchChange={handleSearchChange}
		/>
	);
}
