import { LocalDateSchema, TenantPermission } from "@repo/api-contracts";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import {
	customerListPermissions,
	inventoryWorkspacePermissions,
	productWorkspacePermissions,
	promotionListPermissions,
	rentalWorkspacePermissions,
	settingsPermissions,
} from "@/auth/capabilities";
import { can, canAny, requireRouteAccess } from "@/auth/permissions";
import {
	RentalOperationsDashboardPage,
	type RentalOperationsSearch,
} from "@/modules/rentals/rental-operations/rental-operations-dashboard-page";

const rentalOperationsSearchSchema = z
	.object({
		from: LocalDateSchema.optional(),
		to: LocalDateSchema.optional(),
	})
	.refine(({ from, to }) => Boolean(from) === Boolean(to), {
		message: "from and to must be provided together",
		path: ["to"],
	})
	.refine(({ from, to }) => !from || !to || from <= to, {
		message: "from must be before or equal to to",
		path: ["to"],
	});

export const Route = createFileRoute("/_admin/dashboard/")({
	validateSearch: rentalOperationsSearchSchema,
	beforeLoad: ({ context }) => {
		const permissions = context.user.permissions;

		if (can(permissions, TenantPermission.RentalsRead)) {
			return;
		}
		if (canAny(permissions, rentalWorkspacePermissions)) {
			throw redirect({ to: "/dashboard/orders" });
		}
		if (canAny(permissions, inventoryWorkspacePermissions)) {
			throw redirect({ to: "/dashboard/inventory/equipment-types" });
		}
		if (canAny(permissions, productWorkspacePermissions)) {
			throw redirect({ to: "/dashboard/catalog/packages" });
		}
		if (canAny(permissions, customerListPermissions)) {
			throw redirect({ to: "/dashboard/customers" });
		}
		if (canAny(permissions, promotionListPermissions)) {
			throw redirect({ to: "/dashboard/promotions" });
		}
		if (canAny(permissions, settingsPermissions)) {
			throw redirect({ to: "/dashboard/settings" });
		}

		requireRouteAccess(false);
	},
	component: DashboardIndexRoute,
});

function DashboardIndexRoute() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	function handlePeriodChange(
		from: NonNullable<RentalOperationsSearch["from"]>,
		to: NonNullable<RentalOperationsSearch["to"]>,
	) {
		navigate({
			to: ".",
			search: { from, to },
		});
	}

	return (
		<RentalOperationsDashboardPage
			search={search}
			onPeriodChange={handlePeriodChange}
		/>
	);
}
