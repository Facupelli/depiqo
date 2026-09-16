import { createFileRoute, Outlet } from "@tanstack/react-router";
import { teamWorkspacePermissions } from "@/auth/capabilities";
import { canAny, requireRouteAccess } from "@/auth/permissions";

export const Route = createFileRoute("/_admin/dashboard/settings/team")({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			canAny(context.user.permissions, teamWorkspacePermissions),
		);
	},
	component: Outlet,
});
