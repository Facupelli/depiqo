import { TenantPermission } from "@repo/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import { can, requireRouteAccess } from "@/auth/permissions";
import { StorefrontSettingsScreen } from "@/modules/settings/storefront-settings/storefront-settings-screen";

export const Route = createFileRoute("/_admin/dashboard/settings/storefront")({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			can(context.user.permissions, TenantPermission.TenantStorefrontManage),
		);
	},

	component: StorefrontSettingsScreen,
});
