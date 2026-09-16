import { createFileRoute, Outlet } from "@tanstack/react-router";
import { teamWorkspacePermissions } from "@/auth/capabilities";
import { canAny, requireRouteAccess } from "@/auth/permissions";
import { TeamLocalNav } from "@/modules/settings/team/team-local-nav";

export const Route = createFileRoute("/_admin/dashboard/settings/team")({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			canAny(context.user.permissions, teamWorkspacePermissions),
		);
	},
	component: TeamLayout,
});

function TeamLayout() {
	return (
		<div className="space-y-4">
			<TeamLocalNav />
			<Outlet />
		</div>
	);
}
