import { createFileRoute } from "@tanstack/react-router";
import { BusinessSettingsScreen } from "@/modules/settings/business-settings/business-settings-screen";

export const Route = createFileRoute("/_admin/dashboard/settings/business")({
	component: BusinessSettingsScreen,
});
