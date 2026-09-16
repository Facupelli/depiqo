import { TenantPermission } from "@repo/api-contracts";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	customerListPermissions,
	inventoryWorkspacePermissions,
	productWorkspacePermissions,
	promotionListPermissions,
	rentalWorkspacePermissions,
	settingsPermissions,
} from "@/auth/capabilities";
import { can, canAny, requireRouteAccess } from "@/auth/permissions";

export const Route = createFileRoute("/_admin/dashboard/")({
	beforeLoad: ({ context }) => {
		const permissions = context.user.permissions;

		if (can(permissions, TenantPermission.RentalsRead)) {
			throw redirect({ to: "/dashboard/calendar" });
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
});
