import { TenantPermission } from "@repo/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import { can, requireRouteAccess } from "@/auth/permissions";
import { BusinessSettingsScreen } from "@/modules/settings/business-settings/business-settings-screen";

export const Route = createFileRoute("/_admin/dashboard/settings/business")({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			can(context.user.permissions, TenantPermission.TenantSettingsManage),
		);
	},

	component: BusinessSettingsScreen,
});
