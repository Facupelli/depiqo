import { TenantPermission } from "@repo/api-contracts";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { teamWorkspacePermissions } from "@/auth/capabilities";
import { can, canAny, requireRouteAccess } from "@/auth/permissions";

export const Route = createFileRoute("/_admin/dashboard/settings/")({
	beforeLoad: ({ context }) => {
		const permissions = context.user.permissions;

		if (can(permissions, TenantPermission.TenantSettingsManage)) {
			throw redirect({ to: "/dashboard/settings/business" });
		}
		if (canAny(permissions, teamWorkspacePermissions)) {
			throw redirect({ to: "/dashboard/settings/team" });
		}
		if (can(permissions, TenantPermission.BranchesManage)) {
			throw redirect({ to: "/dashboard/settings/branches" });
		}
		if (can(permissions, TenantPermission.TenantStorefrontManage)) {
			throw redirect({ to: "/dashboard/settings/storefront" });
		}
		if (can(permissions, TenantPermission.TenantContractSignerManage)) {
			throw redirect({ to: "/dashboard/settings/contracts" });
		}

		requireRouteAccess(false);
	},
});
