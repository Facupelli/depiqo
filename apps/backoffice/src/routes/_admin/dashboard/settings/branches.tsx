import { TenantPermission } from "@repo/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import { can, requireRouteAccess } from "@/auth/permissions";
import { BranchesSettingsScreen } from "@/modules/settings/branches/list-branches/branches-settings-screen";

export const Route = createFileRoute("/_admin/dashboard/settings/branches")({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			can(context.user.permissions, TenantPermission.BranchesManage),
		);
	},

	component: BranchesSettingsScreen,
});
