import { createFileRoute } from "@tanstack/react-router";
import { TeamRolesScreen } from "@/modules/settings/team/team-roles-screen";

export const Route = createFileRoute("/_admin/dashboard/settings/team/roles")({
	component: TeamRolesRoute,
});

function TeamRolesRoute() {
	const { user } = Route.useRouteContext();
	return (
		<TeamRolesScreen
			permissions={user.permissions}
			currentRoleId={user.tenantRole.id}
		/>
	);
}
