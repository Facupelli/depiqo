import { createFileRoute } from "@tanstack/react-router";
import { BranchesSettingsScreen } from "@/modules/settings/branches/list-branches/branches-settings-screen";

export const Route = createFileRoute("/_admin/dashboard/settings/branches")({
	component: BranchesSettingsScreen,
});
