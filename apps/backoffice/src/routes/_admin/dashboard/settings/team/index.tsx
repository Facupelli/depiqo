import { createFileRoute } from "@tanstack/react-router";
import { TeamMembersScreen } from "@/modules/settings/team/team-members-screen";

export const Route = createFileRoute("/_admin/dashboard/settings/team/")({
	component: TeamRoute,
});

function TeamRoute() {
	const { user } = Route.useRouteContext();
	return (
		<TeamMembersScreen permissions={user.permissions} currentUserId={user.id} />
	);
}
