import { createFileRoute } from "@tanstack/react-router";
import { StorefrontSettingsScreen } from "@/modules/settings/storefront-settings/storefront-settings-screen";

export const Route = createFileRoute("/_admin/dashboard/settings/storefront")({
	component: StorefrontSettingsScreen,
});
